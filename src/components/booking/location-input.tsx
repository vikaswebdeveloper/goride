"use client";

import { Loader2, MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { Place } from "@/services/location/types";

type Props = {
  label: string;
  placeholder: string;
  value: Place | null;
  onChange: (p: Place | null) => void;
  error?: string;
  icon?: React.ReactNode;
};

/** Accessible combobox. Talks to /api/locations/search (provider is chosen server-side; no keys in the browser). */
export function LocationInput({ label, placeholder, value, onChange, error, icon }: Props) {
  const id = useId();
  const [text, setText] = useState(value?.label ?? "");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  // Keep the visible text in sync when the parent changes the value (e.g. swap). Adjusting state during render is the React-recommended pattern.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setText(value?.label ?? "");
  }

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api<Place[]>(`/api/locations/search?q=${encodeURIComponent(text === value?.label ? "" : text)}`, { signal: ctrl.signal });
        setResults(data);
        setActive(0);
      } catch {
        /* aborted or offline – keep previous results */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [text, open, value?.label]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setText(value?.label ?? ""); // revert unselected free text
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [value]);

  function pick(p: Place) {
    onChange(p);
    setText(p.label);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) return setOpen(true);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <div className={cn("flex h-12 items-center gap-2 rounded-xl border bg-background px-3 transition focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/30", error && "border-destructive")}>
        <span className="text-primary">{icon ?? <MapPin className="size-4" />}</span>
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-invalid={!!error}
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            if (value) onChange(null);
          }}
          onKeyDown={onKeyDown}
          className="h-full w-full bg-transparent text-sm font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground"
        />
        {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>
      {error && <p className="mt-1 text-xs text-destructive" role="alert">{error}</p>}
      {open && (
        <ul id={`${id}-list`} role="listbox" className="absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border bg-popover p-1 shadow-lift">
          {results.length === 0 && !loading && <li className="px-3 py-2.5 text-sm text-muted-foreground">No matching cities</li>}
          {results.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(p); }}
              onMouseEnter={() => setActive(i)}
              className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm", i === active && "bg-accent")}
            >
              <MapPin className="size-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">{p.name}</span>
              <span className="truncate text-muted-foreground">{p.state}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
