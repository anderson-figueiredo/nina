import assert from "node:assert/strict";
import { INTERACTION_CASES, routeIntent } from "./mock-systems";
import { answerCommand, interpretCommand } from "./simulated-nina";

let failures = 0;

for (const testCase of INTERACTION_CASES) {
  const interpreted = interpretCommand(testCase.utterance);
  const calls = routeIntent(interpreted.nina, interpreted.context);
  const systems = calls.map((call) => call.system);
  const answer = answerCommand(testCase.utterance);
  const problems: string[] = [];
  if (interpreted.nina.intent !== testCase.nina.intent) {
    problems.push(`intent ${interpreted.nina.intent} != ${testCase.nina.intent}`);
  }
  if (systems.join(",") !== testCase.expectedSystems.join(",")) {
    problems.push(`systems ${systems.join(",")} != ${testCase.expectedSystems.join(",")}`);
  }
  if (!answer.text || answer.text.includes("undefined") || answer.text.includes("{")) {
    problems.push(`resposta inválida: ${answer.text}`);
  }
  if (problems.length) {
    failures += 1;
    console.error(`FAIL ${testCase.id}: ${problems.join(" | ")}`);
  }
}

const freeform = [
  "qual o status do pedido 123123 por favor",
  "tem estoque do produto NITRO 32% no depósito de Guaratinguetá?",
  "abre um pedido de 2000 litros de NITRO 32% para a Hommerson Agro",
  "pedido entrega cliente",
];

for (const utterance of freeform) {
  const answer = answerCommand(utterance);
  if (!answer.text || answer.text.includes("undefined")) {
    failures += 1;
    console.error(`FAIL freeform "${utterance}": ${answer.text}`);
  } else {
    console.log(`OK freeform: ${answer.text}`);
  }
}

assert.equal(failures, 0, `${failures} cenário(s) falharam`);
console.log(`OK ${INTERACTION_CASES.length} cenários do catálogo`);
