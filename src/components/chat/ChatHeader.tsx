import { ArrowLeft, Bug, MoreVertical, Phone, Video } from "lucide-react";
import ninaAvatar from "@/assets/nina-avatar.svg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ChatHeaderProps = {
  status: string;
  onClear: () => void;
  onOpenDebug: () => void;
};

export function ChatHeader({ status, onClear, onOpenDebug }: ChatHeaderProps) {
  return (
    <header className="flex shrink-0 items-center gap-3 bg-wa-header px-2 py-2 text-wa-header-foreground">
      <button
        type="button"
        aria-label="Voltar"
        className="rounded-full p-1 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <ArrowLeft className="size-5" />
      </button>

      <img
        src={ninaAvatar}
        alt=""
        width={40}
        height={40}
        className="size-10 rounded-full object-cover"
      />

      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-base font-medium">NiNA · NITRO</p>
        <p className="truncate text-xs text-wa-header-foreground/75">{status}</p>
      </div>

      <button
        type="button"
        aria-label="Painel Developer"
        onClick={onOpenDebug}
        className="rounded-full p-2 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <Bug className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Chamada de vídeo"
        className="rounded-full p-2 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <Video className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Chamada de voz"
        className="hidden rounded-full p-2 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:block"
      >
        <Phone className="size-5" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Mais opções"
          className="rounded-full p-2 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <MoreVertical className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onClear}>Limpar conversa</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
