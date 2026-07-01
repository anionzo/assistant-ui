"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@idx/i18n";

export function Table({
  headers,
  children,
  className,
  footer,
}: {
  headers: string[];
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
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
      {footer}
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
  const t = useT();
  return (
    <tr>
      <td className="px-4 py-6 text-center text-sm text-muted-foreground" colSpan={colSpan}>
        {message ?? t("table.noData")}
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
  const t = useT();
  return (
    <tr>
      <td className="px-4 py-6 text-center text-sm text-muted-foreground" colSpan={colSpan}>
        {message ?? t("table.loading")}
      </td>
    </tr>
  );
}
