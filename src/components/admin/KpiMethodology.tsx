import * as React from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { KPI_METHODOLOGY } from "@/lib/analytics/kpi-series";

/**
 * Explains exactly how each dashboard KPI is computed and which table powers it,
 * so numbers on the analytics page can be audited without reading the code.
 */
export function KpiMethodology() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Info className="mr-1.5 h-4 w-4" /> Methodology
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>KPI methodology</SheetTitle>
          <SheetDescription>
            Every metric is derived from live rows in the production database. Reads are
            paginated in 1000-row pages, so totals and distinct counts are exact.
          </SheetDescription>
        </SheetHeader>

        <ul className="mt-4 space-y-3">
          {KPI_METHODOLOGY.map((m) => (
            <li key={m.title} className="rounded-xl border border-border/60 p-3">
              <p className="text-sm font-medium">{m.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="uppercase tracking-wider">Source</span>{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{m.source}</code>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="uppercase tracking-wider">Formula</span> {m.formula}
              </p>
              {m.notes && <p className="mt-1 text-xs text-muted-foreground/80 italic">{m.notes}</p>}
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
