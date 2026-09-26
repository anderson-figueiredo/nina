/**
 * Interpretação e resposta da Nina sem chamada a modelo externo.
 * O catálogo de falas conhecidas reproduz os cenários simulados;
 * o restante é classificado por regras e respondido com os mesmos sistemas.
 */
import {
  detectClientMismatch,
  detectInsights,
  INTERACTION_CASES,
  routeIntent,
  type NinaIntent,
  type NinaResult,
  type RouteContext,
  type SystemCall,
} from "./mock-systems";

export type TurnMemory = {
  nina: NinaResult;
  guardCode?: string;
};

const DEFAULT_CONTEXT: RouteContext = {
  rtvId: "RTV-4412",
  authenticationLevel: "aal_financial",
};

const CLIENT_NAMES = [
  "Agropecuária São José LTDA",
  "Agropecuária São José",
  "Hommerson Agropecuária",
  "Cooperativa Vale Verde",
  "Fazenda Boa Vista",
  "Fazenda Santa Fé",
  "Fazenda Esperança",
  "Fazenda Horizonte",
  "Hommerson Agro",
  "Sítio Primavera",
  "São José",
];

const CITY_TO_CLIENT: Record<string, string> = {
  "rio verde": "Hommerson Agro",
  jatai: "Hommerson Agropecuária",
  uberaba: "Fazenda Boa Vista",
  "ribeirao preto": "Agropecuária São José",
  araxa: "Sítio Primavera",
  "patos de minas": "Fazenda Santa Fé",
  uberlandia: "Fazenda Esperança",
  catalao: "Fazenda Horizonte",
  cristalina: "Cooperativa Vale Verde",
};

const KNOWN_ORDER_IDS = [
  "123123",
  "456789",
  "789123",
  "321654",
  "147258",
  "555000",
  "990010",
  "888000",
  "777001",
  "000999",
  "999999",
  "12345",
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(ltda|s\/a|sa|me|epp)\b/g, "")
    .replace(/[^a-z0-9% ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string) {
  return new Set(normalizeText(value).split(" ").filter((token) => token.length > 1));
}

function jaccard(left: string, right: string) {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function orderIdsIn(text: string) {
  const normalized = normalizeText(text);
  return KNOWN_ORDER_IDS.filter((id) => normalized.includes(id));
}

function matchCatalog(text: string) {
  const normalized = normalizeText(text);
  const exact = INTERACTION_CASES.find((entry) => normalizeText(entry.utterance) === normalized);
  if (exact) return exact;

  const ids = orderIdsIn(text);
  let best: { entry: (typeof INTERACTION_CASES)[number]; score: number } | null = null;
  for (const entry of INTERACTION_CASES) {
    const entryIds = orderIdsIn(entry.utterance);
    if (ids.join("|") !== entryIds.join("|")) continue;
    const score = jaccard(text, entry.utterance);
    if (!best || score > best.score) best = { entry, score };
  }
  if (!best) return null;
  const utterance = normalizeText(best.entry.utterance);
  const contained = normalized.includes(utterance) || utterance.includes(normalized);
  const ratio =
    Math.min(normalized.length, utterance.length) / Math.max(normalized.length, utterance.length);
  if (best.score >= 0.84 || (contained && best.score >= 0.7 && ratio > 0.62)) return best.entry;
  return null;
}

function canonicalClient(name: string) {
  if (normalizeText(name) === "sao jose") return "Agropecuária São José";
  return name;
}

function extractClient(text: string) {
  const normalized = normalizeText(text);
  if (/\bhommerson\b/.test(normalized) && !normalized.includes("agro")) return "Hommerson";
  const found = CLIENT_NAMES.map((name) => ({ name, key: normalizeText(name) }))
    .filter((entry) => entry.key && normalized.includes(entry.key))
    .sort((a, b) => b.key.length - a.key.length)[0];
  return found ? canonicalClient(found.name) : "";
}

function extractCityClient(text: string) {
  const normalized = normalizeText(text);
  const city = Object.keys(CITY_TO_CLIENT)
    .sort((a, b) => b.length - a.length)
    .find((key) => normalized.includes(key));
  return city ? CITY_TO_CLIENT[city] : "";
}

function extractProduct(text: string) {
  const normalized = normalizeText(text);
  if (normalized.includes("nitro 40")) return "NITRO 40%";
  if (normalized.includes("nitro mix")) return "NITRO MIX";
  if (normalized.includes("nitro 32") || normalized.includes("nitro32")) return "NITRO 32%";
  return "";
}

function extractLocation(text: string) {
  const normalized = normalizeText(text);
  if (normalized.includes("guaratingueta")) return "Guaratinguetá";
  if (normalized.includes("rio verde")) return "Rio Verde";
  if (normalized.includes("sorriso")) return "Sorriso";
  return "";
}

function extractOrderId(text: string) {
  return orderIdsIn(text)[0] ?? "";
}

function extractBatch(text: string) {
  const match = text.toUpperCase().match(/LOTE[-\s]?(\d{4}-\d{2}-\d+)/);
  return match ? `LOTE-${match[1]}` : "";
}

function extractInvoice(text: string) {
  const normalized = normalizeText(text);
  const labeled = normalized.match(/(?:nota|nf|nfe|numero)\s+(\d{5,})/);
  if (labeled && !KNOWN_ORDER_IDS.includes(labeled[1])) return labeled[1];
  const numbers = normalized.match(/\b\d{5,}\b/g) ?? [];
  return numbers.find((number) => !KNOWN_ORDER_IDS.includes(number)) ?? "";
}

function extractQuantity(text: string) {
  const match = normalizeText(text).match(/(\d+)\s*litros/);
  return match ? Number(match[1]) : null;
}

function extractPhone(text: string) {
  const match = text.match(/\(?\d{2}\)?\s*\d{4,5}-?\d{4}/);
  return match?.[0] ?? "";
}

function parseAmountMinor(text: string) {
  const normalized = normalizeText(text).replace(/(\d)\s+(?=\d{3}\b)/g, "$1");
  const million = normalized.match(/(\d+(?:[.,]\d+)?)\s*milhao/);
  if (million) return Math.round(Number(million[1].replace(",", ".")) * 100_000_000);
  const thousand = normalized.match(/(\d+(?:[.,]\d+)?)\s*mil\b/);
  if (thousand) return Math.round(Number(thousand[1].replace(",", ".")) * 100_000);
  const reais = normalized.match(/r\$\s*(\d+(?:[.,]\d+)?)/);
  if (reais) return Math.round(Number(reais[1].replace(/\./g, "").replace(",", ".")) * 100);
  return null;
}

function customerMention(name: string) {
  return name
    ? { customer: { raw: name, type: "CUSTOMER_NAME" as const } }
    : undefined;
}

function baseResult(
  intent: NinaIntent,
  text: string,
  parameters: Record<string, unknown>,
  extra: Partial<NinaResult> = {},
): NinaResult {
  return {
    intent,
    confidence: extra.confidence ?? 0.9,
    parameters,
    original_text: text,
    ...extra,
  };
}

function isInjection(text: string) {
  const normalized = normalizeText(text);
  return (
    /ignore (suas |as |o )?(regras|catalogo)/.test(normalized) ||
    /liste (a |toda |todos )?(carteira|clientes)/.test(normalized) ||
    normalized.includes("todos os clientes") ||
    normalized.includes("cnpj e limite") ||
    normalized.includes("prompt injection") ||
    /se passe por|sou o gerente|outro rtv|dados de outro/.test(normalized)
  );
}

function isOutOfScope(text: string) {
  const normalized = normalizeText(text);
  return /previsao do tempo|clima\b|ferias|holerite|futebol|receita de |piada|horoscopo/.test(
    normalized,
  );
}

function isHandoff(text: string) {
  const normalized = normalizeText(text);
  return /humano|pessoa do time|suporte|atendente|falar com uma pessoa/.test(normalized);
}

function mentionsCredit(text: string) {
  return /credito|limite|cabe um pedido|analise de credito|consegue (um |fazer um )?pedido/.test(
    normalizeText(text),
  );
}

function classifyFragment(text: string): { type: NinaIntent; parameters: Record<string, unknown> } | null {
  const normalized = normalizeText(text);
  const client = extractClient(text);
  const orderId = extractOrderId(text);
  const batch = extractBatch(text);
  const product = extractProduct(text);
  const location = extractLocation(text);
  const amount = parseAmountMinor(text);

  if (batch || normalized.includes("lote de producao") || normalized.includes("lote ")) {
    if (batch) return { type: "CHECK_PRODUCTION_BATCH", parameters: { batch_id: batch } };
  }
  if (/estoque|deposito/.test(normalized) || (product && /tem|saldo/.test(normalized))) {
    return {
      type: "CHECK_STOCK_INTERNAL",
      parameters: { product_name: product, location },
    };
  }
  if (/nota fiscal|\bnf\b|nfe/.test(normalized)) {
    return {
      type: "CHECK_INVOICE",
      parameters: { order_id: orderId, invoice_number: extractInvoice(text) },
    };
  }
  if (mentionsCredit(text) && !orderId) {
    return {
      type: "credit_analysis",
      parameters: { ...(client ? { client_name: client } : {}), ...(amount != null ? { amountMinor: amount } : {}) },
    };
  }
  if (/visita|visitar|briefing|me prepara/.test(normalized)) {
    return { type: "visit_preparation", parameters: client ? { client_name: client } : {} };
  }
  if (/atualiza|altera|muda o (telefone|endereco)|telefone/.test(normalized) && client) {
    const phone = extractPhone(text);
    return {
      type: "customer_update",
      parameters: {
        client_name: client,
        ...(phone ? { fields: { phone } } : {}),
      },
    };
  }
  if (/abre um pedido|abrir pedido|novo pedido|registrar pedido|rascunho/.test(normalized)) {
    return {
      type: "order_create",
      parameters: {
        ...(client ? { client_name: client } : {}),
        ...(product ? { product_name: product } : {}),
        ...(extractQuantity(text) != null ? { quantity: extractQuantity(text) } : {}),
      },
    };
  }
  if (/dados cadastrais|mostra o cadastro|me passa os dados/.test(normalized)) {
    return { type: "customer_lookup", parameters: client ? { client_name: client } : {} };
  }
  if (orderId && /entrega|previsao|quando chega|ocorrencia|eta/.test(normalized)) {
    return {
      type: "CHECK_DELIVERY_DATE",
      parameters: { order_id: orderId, ...(client ? { client_name: client } : {}) },
    };
  }
  if (/ultimo pedido/.test(normalized)) {
    return {
      type: "order_query",
      parameters: { ...(client ? { client_name: client } : {}), orderSelector: "LAST" },
    };
  }
  if (orderId) {
    return {
      type: "CHECK_ORDER_STATUS",
      parameters: { order_id: orderId, ...(client ? { client_name: client } : {}) },
    };
  }
  if (/situacao cadastral|como esta o cadastro|situacao do cliente|cadastro d/.test(normalized)) {
    return { type: "CHECK_CLIENT_STATUS", parameters: client ? { client_name: client } : {} };
  }
  return null;
}

function parseFreeform(text: string, memory?: TurnMemory): NinaResult {
  const trimmed = text.trim();
  const normalized = normalizeText(trimmed);

  if (!normalized) {
    return baseResult("UNKNOWN", trimmed, {}, { confidence: 0.1, clarificationCode: "MISSING_CUSTOMER" });
  }
  if (isInjection(trimmed)) {
    return baseResult(
      "out_of_scope",
      trimmed,
      {},
      { confidence: 0.9, guardrailFlags: ["PROMPT_INJECTION", "PII_EXFILTRATION"] },
    );
  }
  if (isOutOfScope(trimmed)) {
    return baseResult("out_of_scope", trimmed, {}, { confidence: 0.93, guardrailFlags: ["OUT_OF_SCOPE"] });
  }
  if (isHandoff(trimmed)) {
    const down = /suporte humano|itsm/.test(normalized);
    return baseResult("human_handoff_request", trimmed, {
      conversationId: down ? "cnv_itsm_down" : "cnv_credit_hommerson",
    }, { confidence: 0.94 });
  }

  if (memory?.guardCode === "AMBIGUOUS_CUSTOMER" || memory?.guardCode === "MISSING_CUSTOMER") {
    const client = extractClient(trimmed) || extractCityClient(trimmed);
    if (client) {
      const pending = memory.nina.pendingIntent ?? memory.nina.intent;
      const amount = memory.nina.parameters?.["amountMinor"] ?? parseAmountMinor(trimmed);
      return baseResult(
        "clarification_response",
        trimmed,
        {
          client_name: client,
          ...(amount != null ? { amountMinor: amount } : {}),
        },
        {
          confidence: 0.88,
          pendingIntent: pending === "clarification_response" ? "credit_analysis" : pending,
          mentions: customerMention(client),
          requestedTopics: memory.nina.requestedTopics,
        },
      );
    }
  }

  if (/\s+e\s+/.test(normalized)) {
    const parts = trimmed.split(/\s+e\s+/i).map((part) => classifyFragment(part)).filter(Boolean);
    const types = new Set(parts.map((part) => part?.type));
    if (parts.length >= 2 && types.size >= 2) {
      return baseResult(
        "MULTI_INTENT",
        trimmed,
        { intents: parts.map((part) => ({ type: part!.type, ...part!.parameters })) },
        { confidence: 0.84 },
      );
    }
  }

  const client = extractClient(trimmed);
  const orderId = extractOrderId(trimmed);
  const amount = parseAmountMinor(trimmed);
  const product = extractProduct(trimmed);
  const batch = extractBatch(trimmed);

  if (batch) {
    return baseResult("CHECK_PRODUCTION_BATCH", trimmed, { batch_id: batch }, { confidence: 0.95 });
  }

  if (/estoque|deposito/.test(normalized) || (product && /tem |saldo/.test(normalized))) {
    return baseResult(
      "CHECK_STOCK_INTERNAL",
      trimmed,
      { product_name: product, location: extractLocation(trimmed) },
      { confidence: 0.93 },
    );
  }

  if (/nota fiscal|\bnf\b|\bnfe\b|cade a nota/.test(normalized)) {
    return baseResult(
      "CHECK_INVOICE",
      trimmed,
      { order_id: orderId, invoice_number: extractInvoice(trimmed) },
      { confidence: 0.92 },
    );
  }

  if (/visita|visitar|briefing|me prepara/.test(normalized)) {
    return baseResult(
      "visit_preparation",
      trimmed,
      client ? { client_name: client } : {},
      { confidence: 0.9, mentions: customerMention(client), requestedTopics: ["visits", "orders", "credit", "logistics"] },
    );
  }

  if (orderId && mentionsCredit(trimmed)) {
    return baseResult(
      "order_query",
      trimmed,
      { order_id: orderId, ...(client ? { client_name: client } : {}) },
      {
        confidence: 0.9,
        mentions: customerMention(client),
        requestedTopics: ["delivery_eta", "order_status", "credit_limit", "credit_available"],
      },
    );
  }

  if (mentionsCredit(trimmed)) {
    return baseResult(
      "credit_analysis",
      trimmed,
      {
        ...(client ? { client_name: client } : {}),
        ...(amount != null ? { amountMinor: amount } : {}),
      },
      {
        confidence: client ? 0.9 : 0.8,
        mentions: {
          ...(customerMention(client) ?? {}),
          ...(amount != null
            ? { requestedOrderAmount: { raw: String(amount), amountMinor: amount, currency: "BRL" } }
            : {}),
        },
        requestedTopics: ["credit_limit", "credit_available", "credit_check_amount", "overdue_titles"],
        ...(client ? {} : { clarificationCode: "MISSING_CUSTOMER" }),
      },
    );
  }

  if (/atualiza|altera|muda o/.test(normalized)) {
    const phone = extractPhone(trimmed);
    const city = extractLocation(trimmed);
    return baseResult(
      "customer_update",
      trimmed,
      {
        ...(client ? { client_name: client } : {}),
        fields: {
          ...(phone ? { phone } : {}),
          ...(city && /endereco|cidade/.test(normalized) ? { city } : {}),
        },
      },
      { confidence: 0.88, mentions: customerMention(client) },
    );
  }

  if (/abre um pedido|abrir pedido|novo pedido|registrar pedido|rascunho/.test(normalized)) {
    const confirmed = /confirma/.test(normalized);
    return baseResult(
      "order_create",
      trimmed,
      {
        ...(client ? { client_name: client } : {}),
        ...(product ? { product_name: product } : {}),
        ...(extractQuantity(trimmed) != null ? { quantity: extractQuantity(trimmed) } : {}),
        ...(confirmed ? { draft_id: "DRF-20260915-01", confirmedDraftId: "DRF-20260915-01" } : {}),
      },
      { confidence: 0.87, mentions: customerMention(client) },
    );
  }

  if (/dados cadastrais|mostra o cadastro|me passa os dados/.test(normalized)) {
    return baseResult(
      "customer_lookup",
      trimmed,
      client ? { client_name: client } : {},
      { confidence: 0.92, mentions: customerMention(client), requestedTopics: ["registration_data"] },
    );
  }

  if (/ultimo pedido|o pedido dele|o pedido dela/.test(normalized)) {
    return baseResult(
      "order_query",
      trimmed,
      { ...(client ? { client_name: client } : {}), orderSelector: "LAST" },
      {
        confidence: 0.91,
        mentions: { ...(customerMention(client) ?? {}), orderSelector: "LAST" },
        requestedTopics: ["order_status", "delivery_eta"],
      },
    );
  }

  if (orderId && /entrega|previsao|quando chega|ocorrencia|eta|expectativa/.test(normalized)) {
    return baseResult(
      "CHECK_DELIVERY_DATE",
      trimmed,
      { order_id: orderId, ...(client ? { client_name: client } : {}) },
      { confidence: 0.94, mentions: customerMention(client) },
    );
  }

  if (orderId || /status do pedido|situacao do pedido/.test(normalized)) {
    return baseResult(
      "CHECK_ORDER_STATUS",
      trimmed,
      { ...(orderId ? { order_id: orderId } : {}), ...(client ? { client_name: client } : {}) },
      { confidence: orderId ? 0.95 : 0.4, mentions: customerMention(client) },
    );
  }

  if (/situacao cadastral|como esta o cadastro|situacao do cliente|cliente /.test(normalized) && client) {
    return baseResult(
      "CHECK_CLIENT_STATUS",
      trimmed,
      { client_name: client },
      { confidence: 0.9, mentions: customerMention(client) },
    );
  }

  if (/^(pedido|entrega|cliente|nota|status)( (pedido|entrega|cliente|nota|status))+$/.test(normalized)) {
    return baseResult(
      "PARSE_ERROR",
      trimmed,
      {},
      {
        confidence: 0.12,
        error_message:
          "Comando não reconhecido. Tente algo como 'status do pedido 123123', 'entrega do cliente Fazenda Esperança' ou 'nota fiscal do pedido 321654'.",
      },
    );
  }

  return baseResult(
    "UNKNOWN",
    trimmed,
    {},
    {
      confidence: 0.2,
      clarificationCode: client ? null : "MISSING_CUSTOMER",
    },
  );
}

export function interpretCommand(text: string, memory?: TurnMemory) {
  const catalog = matchCatalog(text);
  if (catalog) {
    return {
      nina: { ...catalog.nina, original_text: text.trim() },
      context: catalog.context,
    };
  }
  return { nina: parseFreeform(text, memory), context: DEFAULT_CONTEXT };
}

function brl(amountMinor: number) {
  return (amountMinor / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function moneyText(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return brl(value);
  if (value && typeof value === "object" && "amountMinor" in value) {
    const minor = Number((value as { amountMinor?: number }).amountMinor);
    if (Number.isFinite(minor)) return brl(minor);
  }
  return "";
}

function dateBr(value: unknown) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function callData(calls: SystemCall[], system: SystemCall["system"]) {
  return calls.find((call) => call.system === system)?.data;
}

function formatItems(items: unknown) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items
    .map((item) => {
      const record = asRecord(item);
      if (!record) return "";
      const quantity = record["quantity"];
      const unit = record["unit"];
      const product = record["product"];
      return [quantity, unit, product ? `de ${product}` : ""].filter(Boolean).join(" ");
    })
    .filter(Boolean)
    .join(" e ");
}

function guardReply(data: Record<string, unknown>) {
  const code = String(data["code"] ?? "");
  if (code === "MISSING_CUSTOMER") return "De qual cliente você está falando?";
  if (code === "AMBIGUOUS_CUSTOMER") {
    const candidates = Array.isArray(data["candidates"]) ? data["candidates"] : [];
    const list = candidates
      .map((candidate) => {
        const record = asRecord(candidate);
        if (!record) return "";
        const city = record["city"] ? ` (${record["city"]})` : "";
        return `${record["trade_name"] ?? record["name"] ?? "cliente"}${city}`;
      })
      .filter(Boolean)
      .join(" e ");
    return list
      ? `Tenho mais de um cliente com esse nome na sua carteira: ${list}. Qual deles?`
      : "Há mais de um cliente com esse nome. Qual deles você quer consultar?";
  }
  if (code === "FORBIDDEN" || code === "CROSS_PORTFOLIO") {
    return "Não consegui localizar esse cliente na sua carteira.";
  }
  if (code === "STEP_UP_REQUIRED") {
    return "Para liberar essa consulta preciso que você confirme sua identidade no app. Assim que confirmar eu sigo.";
  }
  if (code === "OUT_OF_SCOPE") {
    return "Isso foge do atendimento da NITRO por aqui. Posso consultar pedido, entrega, nota, crédito, cadastro, lote de produção e estoque.";
  }
  if (code === "PROMPT_INJECTION" || code === "PII_EXFILTRATION" || code === "IDENTITY_SPOOF") {
    return "Não consigo atender esse pedido.";
  }
  if (code === "NLU_REJECTED") {
    return "Não entendi o comando. Tente algo como 'status do pedido 123123' ou 'crédito da Fazenda Esperança'.";
  }
  return "Não consegui concluir essa consulta agora.";
}

function orderSentence(order: Record<string, unknown>, mismatch: ReturnType<typeof detectClientMismatch>) {
  if (order["error"]) return String(order["error"]);
  const client = asRecord(order["client"]);
  const clientName = String(client?.["name"] ?? "cliente não identificado");
  const orderId = String(order["order_id"] ?? "");
  const status = String(order["status"] ?? "sem status");
  const delivery = dateBr(order["delivery_date"]);
  const invoice = asRecord(order["invoice"]);
  const items = formatItems(order["items"]);
  const lead = mismatch
    ? `O pedido ${orderId} existe, mas está vinculado à ${mismatch.actual_client}, não à ${mismatch.informed_client}.`
    : `O pedido ${orderId} da ${clientName} está ${status}.`;
  const pieces = [lead];
  if (order["cancellation_reason"]) pieces.push(`Motivo: ${order["cancellation_reason"]}.`);
  if (delivery) pieces.push(`Entrega prevista para ${delivery}.`);
  if (invoice?.["number"]) {
    const issued = dateBr(invoice["issue_date"]);
    pieces.push(
      `A nota fiscal ${invoice["number"]} já foi emitida${issued ? ` em ${issued}` : ""}.`,
    );
  } else if (order["invoice"] === null) {
    pieces.push("A nota fiscal ainda não foi emitida.");
  }
  if (items) pieces.push(`Itens: ${items}.`);
  return pieces.join(" ");
}

function composeSingle(
  nina: NinaResult,
  calls: SystemCall[],
  mismatch: ReturnType<typeof detectClientMismatch>,
  insights: string[],
) {
  const guard = callData(calls, "GUARD");
  if (guard && calls.every((call) => call.system === "GUARD")) return guardReply(guard);
  if (nina.intent === "PARSE_ERROR") {
    return (
      nina.error_message ??
      "Comando não reconhecido. Tente algo como 'status do pedido 123123' ou 'estoque de NITRO 32% em Guaratinguetá'."
    );
  }
  if (nina.intent === "UNKNOWN" || calls.length === 0) {
    return "Não entendi o comando. Tente algo como 'status do pedido 123123', 'crédito da Hommerson Agro' ou 'estoque de NITRO 32% em Guaratinguetá'.";
  }

  if (
    nina.intent === "CHECK_ORDER_STATUS" ||
    nina.intent === "CHECK_DELIVERY_DATE" ||
    nina.intent === "CHECK_INVOICE" ||
    nina.intent === "order_query"
  ) {
    const order = callData(calls, "TOTVS");
    if (!order) return "Não encontrei o pedido nessa consulta.";
    if (order["invoice_error"]) {
      return `A nota do pedido ${order["order_id"]} ainda não foi emitida. O pedido está ${order["status"] ?? "em aberto"}.`;
    }
    const sentences = [orderSentence(order, mismatch)];
    const tracking = callData(calls, "LOOGAI");
    if (tracking?.["error"] === "TIMEOUT" || insights.includes("ETA_UNAVAILABLE")) {
      sentences.push("A previsão de entrega está indisponível no momento.");
    } else if (tracking?.["exception"]) {
      sentences.push(`Houve ocorrência na entrega: ${tracking["exception"]}.`);
    } else if (tracking?.["eta"]) {
      const eta = dateBr(tracking["eta"]);
      if (eta && !sentences[0]?.includes(eta)) sentences.push(`A logística confirma ETA em ${eta}.`);
    }
    const credit = callData(calls, "TARKEN");
    if (credit) sentences.push(creditSentence(credit, insights));
    return sentences.filter(Boolean).join(" ");
  }

  if (nina.intent === "credit_analysis" || nina.intent === "CHECK_CLIENT_STATUS") {
    const credit = callData(calls, "TARKEN");
    const lecom = callData(calls, "LECOM");
    const titles = callData(calls, "TOTVS");
    const name = String(lecom?.["name"] ?? nina.parameters?.["client_name"] ?? "O cliente");
    const parts: string[] = [];
    if (lecom?.["status"]) {
      parts.push(`${name} está com cadastro ${lecom["status"]}${lecom["city"] ? ` em ${lecom["city"]}` : ""}.`);
    }
    if (credit) parts.push(creditSentence(credit, insights, name));
    if (insights.includes("OVERDUE_TITLES") || (Array.isArray(titles?.["overdue_titles"]) && titles["overdue_titles"].length)) {
      const overdue = Array.isArray(titles?.["overdue_titles"]) ? titles["overdue_titles"] : [];
      const total = overdue.reduce((sum, title) => {
        const record = asRecord(title);
        const amount = asRecord(record?.["amount"]);
        return sum + Number(amount?.["amountMinor"] ?? record?.["amount"] ?? 0);
      }, 0);
      parts.push(
        overdue.length
          ? `Há ${overdue.length} título(s) vencido(s)${total ? `, somando ${brl(total)}` : ""}.`
          : "Há títulos vencidos em aberto.",
      );
    }
    return parts.filter(Boolean).join(" ") || "Não consegui ler a situação desse cliente agora.";
  }

  if (nina.intent === "CHECK_PRODUCTION_BATCH") {
    const batch = callData(calls, "PRODUCAO");
    if (!batch || batch["error"]) return String(batch?.["error"] ?? "Lote não encontrado.");
    const start = dateBr(batch["production_start"]);
    const end = dateBr(batch["production_end"]);
    return `O lote ${batch["batch_id"]} (${batch["product"]}) está ${batch["status"]}. Começou em ${start} e a previsão de término é ${end}. Qualidade ${batch["quality_status"]}, com ${batch["quantity_produced"]} ${batch["unit"]} produzidos.`;
  }

  if (nina.intent === "CHECK_STOCK_INTERNAL") {
    const stock = callData(calls, "ESTOQUE");
    if (!stock || stock["error"]) return String(stock?.["error"] ?? "Não encontrei esse item no estoque.");
    const available = Number(stock["quantity_available"] ?? 0);
    if (available <= 0) {
      return `O estoque de ${stock["product_name"]} em ${stock["location"]} está zerado. Próximo lote: ${stock["next_batch"] ?? "sem previsão"}.`;
    }
    const reserved = Number(stock["reserved"] ?? 0);
    return `Tem ${available.toLocaleString("pt-BR")} ${stock["unit"]} de ${stock["product_name"]} em ${stock["location"]}${reserved ? `, com ${reserved.toLocaleString("pt-BR")} reservados` : ""}. Próximo lote: ${stock["next_batch"] ?? "não informado"}.`;
  }

  if (nina.intent === "visit_preparation") {
    const lecom = callData(calls, "LECOM");
    const totvs = callData(calls, "TOTVS");
    const credit = callData(calls, "TARKEN");
    const name = String(lecom?.["name"] ?? "o cliente");
    const parts = [
      `Briefing de ${name}: cadastro ${lecom?.["status"] ?? "sem status"}${lecom?.["city"] ? ` em ${lecom["city"]}` : ""}.`,
    ];
    if (insights.includes("VISIT_GAP")) {
      parts.push(
        `Faz ${lecom?.["visit_gap_days"] ?? "vários"} dias sem visita. A última foi em ${dateBr(lecom?.["last_visit_date"]) || "data não informada"}.`,
      );
    } else if (lecom?.["last_visit_date"]) {
      parts.push(`Última visita em ${dateBr(lecom["last_visit_date"])}.`);
    }
    const open = Array.isArray(totvs?.["open_orders"]) ? totvs["open_orders"] : [];
    if (open.length) {
      const first = asRecord(open[0]);
      parts.push(
        `Há ${open.length} pedido(s) em aberto${first?.["order_id"] ? `, o mais recente é o ${first["order_id"]} (${first["status"]})` : ""}.`,
      );
    }
    if (credit && !credit["error"]) parts.push(creditSentence(credit, insights, name));
    return parts.join(" ");
  }

  if (nina.intent === "customer_lookup") {
    const lecom = callData(calls, "LECOM");
    if (!lecom || lecom["error"]) return "Não encontrei esse cadastro na sua carteira.";
    const last = dateBr(lecom["last_purchase_date"]);
    return `${lecom["name"]} (${lecom["trade_name"]}) está ${lecom["status"]} em ${lecom["city"]}. Documento ${lecom["document"]}, tipo ${lecom["type"]}${last ? `. Última compra em ${last}` : ""}.`;
  }

  if (nina.intent === "customer_update") {
    const lecom = callData(calls, "LECOM");
    const fields = asRecord(lecom?.["requested_fields"]) ?? asRecord(nina.parameters["fields"]) ?? {};
    const changes = Object.entries(fields)
      .map(([key, value]) => `${key} para ${value}`)
      .join(", ");
    return `Antes de gravar o cadastro de ${lecom?.["name"] ?? "o cliente"}${changes ? `: ${changes}` : ""}. Confirma que eu registro? Ainda não alterei nada.`;
  }

  if (nina.intent === "order_create") {
    const portal = callData(calls, "PORTAL");
    if (!portal || portal["error"]) return String(portal?.["error"] ?? "Não encontrei rascunho para esse pedido.");
    const requestedProduct = String(nina.parameters["product_name"] ?? "");
    const requestedQuantity = nina.parameters["quantity"];
    const clientName = String(nina.parameters["client_name"] ?? asRecord(portal["client"])?.["name"] ?? "o cliente");
    const total = moneyText(portal["requested_amount"] ?? portal["total"]);
    const items = formatItems(portal["items"]);
    if (portal["status"] === "CONFIRMED_PENDING_OUTBOX") {
      return `Rascunho ${portal["draft_id"] ?? ""} registrado e aguardando integração. ${items ? `Itens: ${items}.` : ""} ${total ? `Valor ${total}.` : ""}`.replace(/\s+/g, " ").trim();
    }
    if (requestedProduct && requestedQuantity != null) {
      return `Antes de abrir: pedido de ${requestedQuantity} litros de ${requestedProduct} para ${clientName}. Confirma que eu registro? Ainda não efetivei o pedido.`;
    }
    return `Antes de abrir: ${items || "o rascunho do portal"} para ${clientName}${total ? `, total de ${total}` : ""}. Confirma que eu registro? Ainda não efetivei o pedido.`;
  }

  if (nina.intent === "human_handoff_request") {
    const itsm = callData(calls, "ITSM");
    if (itsm?.["error"] || itsm?.["ticketLinkStatus"] === "UNAVAILABLE") {
      return "O chamado humano não pôde ser aberto agora, mas a conversa segue por aqui. Tente de novo em alguns minutos.";
    }
    return `Chamado ${itsm?.["ticketId"] ?? "aberto"} na fila, pelo Teams. Status ${itsm?.["handoff_status"] ?? "QUEUED"}.`;
  }

  return "Consultei os sistemas simulados, mas não tenho uma leitura clara para esse comando.";
}

function creditSentence(credit: Record<string, unknown>, insights: string[], name = "O cliente") {
  if (credit["error"] === "TIMEOUT" || credit["status"] === "TIMEOUT" || insights.includes("CREDIT_UNAVAILABLE")) {
    return `Não consegui a leitura de crédito agora, o sistema não respondeu. Tenta de novo em alguns minutos.`;
  }
  const limit = moneyText(credit["credit_limit"]);
  const available = moneyText(credit["credit_available"]);
  const requested = moneyText(credit["requested_order_amount"]);
  const decision = String(credit["credit_decision"] ?? credit["insight"] ?? "");
  const ratio = Number(credit["usage_ratio"] ?? 0);
  if (decision === "CREDIT_INSUFFICIENT" && requested) {
    return `${name} tem limite de ${limit} e disponível de ${available}, então ${requested} não cabe hoje. Isso é só a leitura do crédito, não é aprovação do pedido.`;
  }
  if (decision === "CREDIT_SUFFICIENT_FOR_AMOUNT" && requested) {
    return `O disponível de ${available} comporta ${requested}, dentro do limite de ${limit}. Isso não é aprovação do pedido.`;
  }
  if (decision === "CREDIT_NEAR_LIMIT" || insights.includes("CREDIT_NEAR_LIMIT") || ratio >= 0.8) {
    return `${name} está perto do limite: ${limit} de limite, ${available} disponível (${Math.round(ratio * 100)}% de uso).`;
  }
  if (credit["status"] === "BLOQUEADO" || credit["status"] === "SUSPENSO") {
    return `${name} está ${credit["status"]}${credit["block_reason"] ? `: ${credit["block_reason"]}` : ""}. Disponível ${available || "zerado"}.`;
  }
  if (limit || available) return `Limite de ${limit || "não informado"} e disponível de ${available || "não informado"}.`;
  return "Não há leitura de crédito para esse cliente.";
}

export function composeReply(
  nina: NinaResult,
  calls: SystemCall[],
  mismatch: ReturnType<typeof detectClientMismatch>,
  insights: string[],
  context?: RouteContext,
) {
  if (nina.intent === "MULTI_INTENT") {
    const intents = Array.isArray(nina.parameters?.["intents"])
      ? (nina.parameters["intents"] as Record<string, unknown>[])
      : [];
    const parts = intents.map((entry) => {
      const child: NinaResult = {
        intent: String(entry["type"] ?? "UNKNOWN") as NinaIntent,
        confidence: nina.confidence,
        parameters: entry,
        original_text: nina.original_text,
        mentions: entry["client_name"]
          ? { customer: { raw: entry["client_name"], type: "CUSTOMER_NAME" } }
          : undefined,
      };
      const childCalls = routeIntent(child, context);
      return composeSingle(
        child,
        childCalls,
        detectClientMismatch(child, childCalls),
        detectInsights(child, childCalls),
      );
    });
    return parts.filter(Boolean).join(" ");
  }
  return composeSingle(nina, calls, mismatch, insights);
}

export function answerCommand(text: string, memory?: TurnMemory) {
  const { nina, context } = interpretCommand(text, memory);
  const calls = routeIntent(nina, context);
  const mismatch = detectClientMismatch(nina, calls);
  const insights = detectInsights(nina, calls);
  const guard = calls.find((call) => call.system === "GUARD");
  return {
    text: composeReply(nina, calls, mismatch, insights, context),
    debug: {
      simulated: true,
      nina_intent: nina.intent,
      nina_confidence: nina.confidence,
      nina,
      systems: Object.fromEntries(calls.map((call) => [call.system, call.data])),
      system_calls: calls,
      insights,
      ...(mismatch ?? {}),
    },
    memory: {
      nina,
      guardCode: guard ? String(guard.data["code"] ?? "") : undefined,
    } satisfies TurnMemory,
  };
}
