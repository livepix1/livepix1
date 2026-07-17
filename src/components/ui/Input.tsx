import { forwardRef } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const baseField =
  "w-full rounded-xl border border-white/10 bg-pixflow-darker/60 px-4 py-3 text-pixflow-slate placeholder:text-white/30 transition-colors focus:border-pixflow-cyan focus:outline-none focus:ring-1 focus:ring-pixflow-cyan/50 disabled:opacity-50";

interface FieldWrapProps {
  label?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export function Field({ label, error, hint, children }: FieldWrapProps) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-sm font-medium text-pixflow-slate/80">{label}</span>
      )}
      {children}
      {error ? (
        <span className="block text-xs text-pixflow-magenta">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-white/40">{hint}</span>
      ) : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(baseField, className)} {...props} />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(baseField, "min-h-[96px] resize-y", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(baseField, "appearance-none", className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";
