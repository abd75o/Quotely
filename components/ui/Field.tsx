"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface FieldShellProps {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function FieldShell({ label, htmlFor, hint, error, children, className }: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-sm font-semibold text-[var(--text-primary)]"
        >
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

const inputBase =
  "w-full h-11 px-3.5 text-sm bg-white border border-[var(--border)] rounded-xl outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 placeholder:text-[var(--text-muted)] transition-all disabled:bg-gray-50 disabled:text-[var(--text-muted)]";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, id, className, ...rest },
  ref
) {
  return (
    <FieldShell label={label} htmlFor={id} hint={hint} error={error}>
      <input
        ref={ref}
        id={id}
        className={cn(inputBase, error && "border-red-300 focus:border-red-500 focus:ring-red-200", className)}
        {...rest}
      />
    </FieldShell>
  );
});

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function SelectField({ label, hint, error, id, options, className, ...rest }: SelectFieldProps) {
  return (
    <FieldShell label={label} htmlFor={id} hint={hint} error={error}>
      <select
        id={id}
        className={cn(inputBase, "cursor-pointer pr-9 appearance-none bg-[length:14px] bg-no-repeat bg-[right_14px_center]", className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
        }}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function TextareaField({ label, hint, error, id, className, ...rest }: TextareaFieldProps) {
  return (
    <FieldShell label={label} htmlFor={id} hint={hint} error={error}>
      <textarea
        id={id}
        className={cn(
          "w-full px-3.5 py-2.5 text-sm bg-white border border-[var(--border)] rounded-xl outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 resize-y placeholder:text-[var(--text-muted)] transition-all",
          error && "border-red-300 focus:border-red-500 focus:ring-red-200",
          className
        )}
        {...rest}
      />
    </FieldShell>
  );
}
