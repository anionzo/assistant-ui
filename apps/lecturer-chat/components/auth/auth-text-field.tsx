"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type AuthTextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  icon: ReactNode;
  label: ReactNode;
  action?: ReactNode;
};

export function AuthTextField({
  action,
  className,
  icon,
  label,
  type = "text",
  ...props
}: AuthTextFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <label className="flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-slate-700">{label}</span>
        {action}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center text-slate-400">
          {icon}
        </span>
        <input
          className={cn(
            "h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-950 shadow-sm outline-none transition",
            "placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10",
            isPassword && "pr-10",
            className,
          )}
          type={inputType}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/20"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        ) : null}
      </div>
    </label>
  );
}
