import { CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type MessageBubbleProps = {
  text: string;
  isUser: boolean;
  time: string;
  withTail: boolean;
};

export function MessageBubble({ text, isUser, time, withTail }: MessageBubbleProps) {
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative max-w-[80%] rounded-lg px-2.5 py-1.5 text-[15px] leading-snug shadow-sm",
          isUser ? "bg-wa-bubble-out" : "bg-wa-bubble-in",
          "text-wa-bubble-foreground",
          withTail && (isUser ? "rounded-tr-none" : "rounded-tl-none"),
        )}
      >
        {withTail && (
          <span
            aria-hidden
            className={cn(
              "absolute top-0 size-0 border-t-8",
              isUser
                ? "-right-2 border-l-8 border-l-wa-bubble-out border-t-wa-bubble-out border-r-8 border-r-transparent"
                : "-left-2 border-r-8 border-r-wa-bubble-in border-t-wa-bubble-in border-l-8 border-l-transparent",
            )}
          />
        )}
        <p className="whitespace-pre-wrap break-words pr-14">{text}</p>
        <span className="absolute bottom-1 right-2 flex items-center gap-0.5 text-[11px] text-wa-bubble-meta">
          <span className="sr-only">{isUser ? "Enviada às" : "Recebida às"}</span>
          {time}
          {isUser && <CheckCheck className="size-3.5 text-wa-tick" aria-hidden />}
        </span>
      </div>
    </div>
  );
}
