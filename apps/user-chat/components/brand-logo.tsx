"use client";

import { cn } from "@/lib/utils";

export function BrandLogo({
  src,
  alt,
  className,
  size = 32,
}: {
  src: string;
  alt: string;
  className?: string;
  size?: number;
}) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
      referrerPolicy="no-referrer"
    />
  );
}