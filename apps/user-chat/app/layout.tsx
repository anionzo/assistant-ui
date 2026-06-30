import type { Metadata } from "next";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RuntimeProvider } from "@/lib/runtime-provider";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Idx Chat",
  description: "Trợ lý tuyển sinh HUIT",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi" className={cn("font-sans", geist.variable)}>
      <body>
        <TooltipProvider>
          <RuntimeProvider>{children}</RuntimeProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
