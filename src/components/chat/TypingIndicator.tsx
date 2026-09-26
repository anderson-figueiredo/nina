export function TypingIndicator() {
  return (
    <div className="flex justify-start" role="status">
      <div className="relative rounded-lg rounded-tl-none bg-wa-bubble-in px-4 py-3 text-wa-bubble-foreground shadow-sm">
        <span className="sr-only">NiNA está digitando</span>
        <span className="flex items-center gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-2 animate-bounce rounded-full bg-muted-foreground/60 motion-reduce:animate-none"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
