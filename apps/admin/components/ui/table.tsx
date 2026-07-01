import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Table({
  headers,
  children,
  className,
}: {
  headers: string[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-muted/50 text-muted-foreground">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function TableRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr className={cn("border-b border-border/70 last:border-0", className)}>
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={cn("px-4 py-3", className)}>{children}</td>;
}

export function TableEmpty({
  colSpan,
  message,
}: {
  colSpan: number;
  message?: string;
}) {
  return (
    <tr>
      <td className="px-4 py-6 text-center text-sm text-muted-foreground" colSpan={colSpan}>
        {message ?? "No data."}
      </td>
    </tr>
  );
}

export function TableLoading({
  colSpan,
  message,
}: {
  colSpan: number;
  message?: string;
}) {
  return (
    <tr>
      <td className="px-4 py-6 text-center text-sm text-muted-foreground" colSpan={colSpan}>
        {message ?? "Loading…"}
      </td>
    </tr>
  );
}
