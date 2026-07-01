import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Phase 10 — Data Display
 * Premium table primitives with:
 * - Sticky header support (`stickyHeader`)
 * - Zebra striping (`zebra`)
 * - Hover / selected states via data-state
 * - Density variants (`compact` | `comfortable`)
 * - Hairline dividers using tokenized borders
 */

type Density = "compact" | "comfortable";

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  stickyHeader?: boolean;
  zebra?: boolean;
  density?: Density;
  containerClassName?: string;
}

const DensityCtx = React.createContext<Density>("comfortable");

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, stickyHeader, zebra, density = "comfortable", containerClassName, ...props }, ref) => (
    <div className={cn("relative w-full overflow-auto rounded-xl hairline", containerClassName)}>
      <DensityCtx.Provider value={density}>
        <table
          ref={ref}
          data-sticky={stickyHeader ? "" : undefined}
          data-zebra={zebra ? "" : undefined}
          className={cn(
            "w-full caption-bottom text-sm",
            zebra && "[&_tbody_tr:nth-child(even)]:bg-muted/30",
            stickyHeader && "[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:bg-background/80 [&_thead_th]:backdrop-blur",
            className,
          )}
          {...props}
        />
      </DensityCtx.Provider>
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("[&_tr]:border-b [&_tr]:border-border/60", className)} {...props} />
  ),
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn("border-t border-border/60 bg-muted/40 font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  ),
);
TableFooter.displayName = "TableFooter";

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
  interactive?: boolean;
}
const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, selected, interactive, ...props }, ref) => (
    <tr
      ref={ref}
      data-state={selected ? "selected" : undefined}
      className={cn(
        "border-b border-border/50 transition-colors",
        "data-[state=selected]:bg-primary/10",
        interactive && "cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-ring",
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

type SortDir = "asc" | "desc" | false;
interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: SortDir;
  align?: "left" | "center" | "right";
}
const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, sortable, sortDirection, align = "left", children, ...props }, ref) => {
    const density = React.useContext(DensityCtx);
    return (
      <th
        ref={ref}
        aria-sort={
          sortDirection === "asc" ? "ascending" : sortDirection === "desc" ? "descending" : sortable ? "none" : undefined
        }
        className={cn(
          density === "compact" ? "h-9 px-3" : "h-11 px-4",
          "align-middle font-medium text-muted-foreground text-xs uppercase tracking-wider",
          align === "center" && "text-center",
          align === "right" && "text-right",
          "[&:has([role=checkbox])]:pr-0",
          sortable && "cursor-pointer select-none hover:text-foreground transition-colors",
          className,
        )}
        {...props}
      >
        <span className={cn("inline-flex items-center gap-1.5", align === "right" && "flex-row-reverse")}>
          {children}
          {sortable && (
            <span aria-hidden className="text-[10px] opacity-60">
              {sortDirection === "asc" ? "▲" : sortDirection === "desc" ? "▼" : "↕"}
            </span>
          )}
        </span>
      </th>
    );
  },
);
TableHead.displayName = "TableHead";

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "center" | "right";
  numeric?: boolean;
}
const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, align, numeric, ...props }, ref) => {
    const density = React.useContext(DensityCtx);
    return (
      <td
        ref={ref}
        className={cn(
          density === "compact" ? "px-3 py-2" : "p-4",
          "align-middle",
          (align === "right" || numeric) && "text-right tabular-nums",
          align === "center" && "text-center",
          "[&:has([role=checkbox])]:pr-0",
          className,
        )}
        {...props}
      />
    );
  },
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
  ),
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
