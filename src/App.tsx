import { useEffect, useRef, useState } from "react";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatWallpaper } from "@/components/chat/ChatWallpaper";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { MessageInput } from "@/components/chat/MessageInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { DebugPanel, type DebugEntry } from "@/components/chat/DebugPanel";
import { answerCommand, type TurnMemory } from "@/lib/rtv/simulated-nina";

const STORAGE_KEY = "nina-whatsapp-chat-v1";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const SUGGESTIONS = [
  { label: "Pedido 123123", text: "Qual o status do pedido 123123?" },
  {
    label: "Crédito Hommerson",
    text: "Preciso de uma análise de crédito para o cliente Hommerson Agro para ver se ele consegue fazer um pedido de 1milhão.",
  },
  { label: "Estoque NITRO 32%", text: "Tem NITRO 32% em Guaratinguetá?" },
  { label: "Visita Esperança", text: "Me prepara a visita da Fazenda Esperança." },
];

const WELCOME_MESSAGE: ChatMessage = {
  id: "nina-welcome",
  role: "assistant",
  text: "Oi! Aqui é a NiNA 😊 Posso consultar pedidos, entregas, notas fiscais, situação de clientes, lotes de produção e estoque interno da NITRO. As respostas usam dados simulados, sem modelo externo. O que você precisa?",
};

type StoredChat = {
  messages: ChatMessage[];
  times: Record<string, string>;
};

function formatTime(date = new Date()) {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [times, setTimes] = useState<Record<string, string>>({
    [WELCOME_MESSAGE.id]: formatTime(),
  });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugEntries, setDebugEntries] = useState<DebugEntry[]>([]);
  const memoryRef = useRef<TurnMemory | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const restored = JSON.parse(raw) as StoredChat;
        if (restored.messages?.length) {
          setMessages(restored.messages);
          setTimes(restored.times ?? {});
        }
      }
    } catch {
      /* conversa fica só na memória */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, times }));
    } catch {
      /* storage indisponível */
    }
  }, [loaded, messages, times]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  function sendText(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text };
    setMessages((current) => [...current, userMessage]);
    setTimes((current) => ({ ...current, [userMessage.id]: formatTime() }));
    setInput("");
    setBusy(true);

    const result = answerCommand(text, memoryRef.current);
    memoryRef.current = result.memory;
    const reply: ChatMessage = { id: crypto.randomUUID(), role: "assistant", text: "" };
    window.setTimeout(() => {
      setMessages((current) => [...current, reply]);
      setTimes((current) => ({ ...current, [reply.id]: formatTime() }));
      setDebugEntries((current) => [
        ...current,
        { id: reply.id, command: text, data: result.debug },
      ]);
      let cursor = 0;
      const step = Math.max(2, Math.ceil(result.text.length / 40));
      const timer = window.setInterval(() => {
        cursor = Math.min(result.text.length, cursor + step);
        const partial = result.text.slice(0, cursor);
        setMessages((current) =>
          current.map((message) => (message.id === reply.id ? { ...message, text: partial } : message)),
        );
        if (cursor >= result.text.length) {
          window.clearInterval(timer);
          setBusy(false);
        }
      }, 24);
    }, 450);
  }

  function handleSend() {
    sendText(input);
  }

  function handleClear() {
    memoryRef.current = undefined;
    setDebugEntries([]);
    setMessages([WELCOME_MESSAGE]);
    setTimes({ [WELCOME_MESSAGE.id]: formatTime() });
  }

  const visibleMessages = messages.filter((message) => message.text.length > 0 || busy);

  return (
    <main className="flex min-h-screen justify-center bg-wa-panel">
      <div className="flex h-dvh w-full max-w-md flex-col overflow-hidden bg-wa-chat-bg shadow-xl">
        <ChatHeader
          status={busy ? "digitando..." : "online"}
          onClear={handleClear}
          onOpenDebug={() => setDebugOpen(true)}
        />

        <ChatWallpaper>
          <div
            ref={scrollRef}
            className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Conversa com a NiNA"
          >
            {visibleMessages.map((message, index) => {
              const previous = visibleMessages[index - 1];
              if (!message.text) return null;
              return (
                <MessageBubble
                  key={message.id}
                  text={message.text}
                  isUser={message.role === "user"}
                  time={times[message.id] ?? ""}
                  withTail={!previous || previous.role !== message.role}
                />
              );
            })}

            {busy && (messages.at(-1)?.role === "user" || messages.at(-1)?.text === "") && (
              <TypingIndicator />
            )}
          </div>
        </ChatWallpaper>

        <nav aria-label="Exemplos de consulta" className="flex gap-2 overflow-x-auto bg-wa-panel px-2 pt-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion.label}
              type="button"
              disabled={busy}
              onClick={() => sendText(suggestion.text)}
              className="shrink-0 rounded-full border border-border bg-wa-input px-3 py-1 text-xs text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            >
              {suggestion.label}
            </button>
          ))}
        </nav>
        <MessageInput value={input} onChange={setInput} onSubmit={handleSend} disabled={busy} />
      </div>

      <DebugPanel open={debugOpen} onOpenChange={setDebugOpen} entries={debugEntries} />
    </main>
  );
}
