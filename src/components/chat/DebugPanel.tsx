import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export type DebugEntry = {
  id: string;
  command: string;
  data: unknown;
};

type DebugPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: DebugEntry[];
};

export function DebugPanel({ open, onOpenChange, entries }: DebugPanelProps) {
  const latest = [...entries].reverse();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Painel Developer</SheetTitle>
          <SheetDescription>
            JSON da interpretação simulada da Nina e das consultas aos sistemas internos. Nenhuma
            chamada externa de modelo é feita.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          {latest.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma consulta ainda. Envie um comando para a Nina.
            </p>
          )}

          {latest.map((entry) => (
            <div key={entry.id} className="rounded-md border border-border">
              <p className="truncate border-b border-border px-3 py-2 text-xs font-medium">
                {entry.command || "Consulta"}
              </p>
              <pre className="overflow-x-auto px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                {JSON.stringify(entry.data, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
