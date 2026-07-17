import { cn } from "@/lib/utils";

/**
 * Table row skeleton used across Admin list pages while filtered
 * data loads after a StatCard click.
 */
export function TableSkeleton({ rows = 6, cols = 5, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className={cn("border-t border-border/60", className)}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-3 py-3">
              <div
                className="h-3 rounded bg-muted/60 animate-pulse"
                style={{ width: `${40 + ((r * 7 + c * 13) % 50)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="size-10 rounded-full bg-muted/60 flex items-center justify-center text-lg">∅</div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-xs text-muted-foreground max-w-sm">{description}</p>}
      {action}
    </div>
  );
}
