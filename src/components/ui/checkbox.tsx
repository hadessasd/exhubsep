import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function Checkbox({
  checked,
  onCheckedChange,
  id,
  className,
  label,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  id?: string;
  className?: string;
  label?: React.ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-3.5 transition-colors hover:border-primary/40 hover:bg-bg-soft",
        checked && "border-primary/50 bg-primary-soft/40",
        className,
      )}
    >
      <button
        type="button"
        id={id}
        role="checkbox"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border-strong transition-colors",
          checked && "border-primary bg-primary text-primary-fg",
        )}
      >
        {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
      </button>
      {label ? <div className="min-w-0 flex-1 text-sm">{label}</div> : null}
    </label>
  );
}
