import * as React from "react";
import { cn } from "@/lib/utils";

/** A labelled group card used for each section of the editor. */
export function Section({
  title,
  description,
  icon: Icon,
  children,
  action,
  className,
}: {
  className?: string;
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-xl border bg-card/70 p-5 shadow-sm backdrop-blur-sm", className)}>
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-8 place-items-center rounded-lg border bg-background text-muted-foreground">
            <Icon className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold leading-tight">{title}</h2>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/** Segmented control — a radio group that looks like a pill switcher. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; title?: string }[];
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex rounded-lg border bg-muted/60 p-1", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Range slider with a live value read-out. */
export function Slider({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  format = (v) => String(v),
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        <span className="font-mono tabular-nums text-muted-foreground">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="qr-range w-full"
        style={{ "--pct": `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
}

/** Colour swatch + hex input pair. */
export function ColorField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);

  return (
    <div className={cn("space-y-2", disabled && "pointer-events-none opacity-40")}>
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      <div className="flex h-9 items-center gap-2 rounded-md border bg-background pl-1.5 pr-2 shadow-sm focus-within:ring-1 focus-within:ring-ring">
        <span className="relative size-6 shrink-0 overflow-hidden rounded border shadow-inner">
          <input
            aria-label={`${label} picker`}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -inset-2 size-10 cursor-pointer border-0 bg-transparent p-0"
          />
        </span>
        <input
          id={id}
          value={draft}
          spellCheck={false}
          maxLength={7}
          onChange={(e) => {
            const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
            setDraft(v);
            if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toLowerCase());
          }}
          onBlur={() => setDraft(value)}
          className="w-full bg-transparent font-mono text-xs uppercase outline-none"
        />
      </div>
    </div>
  );
}

export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const textareaClass =
  "flex min-h-[96px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
