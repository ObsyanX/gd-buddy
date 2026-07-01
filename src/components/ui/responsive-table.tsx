import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ResponsiveTable
 *
 * Renders a real <table> from `md:` up and stacks each row as a labelled card
 * on smaller screens. Use for data-dense views (reports, admin, analytics)
 * that should not force horizontal scroll on mobile.
 *
 * @example
 * <ResponsiveTable
 *   columns={[
 *     { key: "name", header: "Name" },
 *     { key: "score", header: "Score", align: "right" },
 *   ]}
 *   rows={data.map(d => ({ id: d.id, name: d.name, score: d.score }))}
 * />
 */
export interface ResponsiveTableColumn<Row> {
  key: keyof Row & string;
  header: string;
  align?: "left" | "right" | "center";
  render?: (row: Row) => React.ReactNode;
}

export interface ResponsiveTableProps<Row extends { id: string | number }> {
  columns: ResponsiveTableColumn<Row>[];
  rows: Row[];
  className?: string;
  emptyMessage?: string;
}

export function ResponsiveTable<Row extends { id: string | number }>({
  columns,
  rows,
  className,
  emptyMessage = "No data yet.",
}: ResponsiveTableProps<Row>) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Mobile: stacked cards */}
      <div className="md:hidden space-y-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-md border p-3 space-y-1.5"
          >
            {columns.map((col) => (
              <div
                key={col.key}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {col.header}
                </span>
                <span className="font-medium text-right break-words">
                  {col.render ? col.render(row) : String(row[col.key] ?? "—")}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Desktop: real table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "py-2 pr-4",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    (!col.align || col.align === "left") && "text-left",
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "py-2 pr-4",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                    )}
                  >
                    {col.render ? col.render(row) : String(row[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
