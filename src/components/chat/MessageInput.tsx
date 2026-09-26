import { useRef, type FormEvent, type KeyboardEvent } from "react";
import { Camera, Mic, Paperclip, SendHorizontal, Smile } from "lucide-react";

type MessageInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
};

export function MessageInput({ value, onChange, onSubmit, disabled }: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasText = value.trim().length > 0;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!hasText || disabled) return;
    onSubmit();
    textareaRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex shrink-0 items-end gap-2 bg-wa-panel px-2 py-2"
    >
      <div className="flex flex-1 items-end gap-1 rounded-3xl bg-wa-input px-3 py-1.5 shadow-sm">
        <button
          type="button"
          aria-label="Emoji"
          className="shrink-0 rounded-full py-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Smile className="size-6" />
        </button>
        <label htmlFor="nina-message" className="sr-only">
          Mensagem para a NiNA
        </label>
        <textarea
          id="nina-message"
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Mensagem"
          className="max-h-28 flex-1 resize-none bg-transparent py-2 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          aria-label="Anexar"
          className="shrink-0 rounded-full py-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Paperclip className="size-6" />
        </button>
        <button
          type="button"
          aria-label="Câmera"
          className="shrink-0 rounded-full py-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Camera className="size-6" />
        </button>
      </div>

      <button
        type="submit"
        aria-label={hasText ? "Enviar" : "Gravar áudio"}
        disabled={disabled}
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-wa-accent text-wa-header-foreground shadow-md transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        {hasText ? <SendHorizontal className="size-5" /> : <Mic className="size-6" />}
      </button>
    </form>
  );
}
