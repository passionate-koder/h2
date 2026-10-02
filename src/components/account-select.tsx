"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
export function AccountSelect({
  label,
  value,
  options,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return (
    <div className="account-field account-select" ref={root}>
      <label id={id}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <button
        type="button"
        role="combobox"
        aria-labelledby={id}
        aria-expanded={open}
        aria-controls={id + "-options"}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setTimeout(
              () =>
                root.current
                  ?.querySelector<HTMLButtonElement>("[role=option]")
                  ?.focus(),
              0,
            );
          }
        }}
      >
        {options.find((o) => o[0] === value)?.[1] || "Select an option"}
        <ChevronDown size={16} />
      </button>
      {open && (
        <div
          className="account-select-options"
          role="listbox"
          id={id + "-options"}
          aria-labelledby={id}
        >
          {options.map(([key, text], i) => (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={key === value}
              onClick={() => {
                onChange(key);
                setOpen(false);
                root.current
                  ?.querySelector<HTMLButtonElement>("[role=combobox]")
                  ?.focus();
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false);
                  root.current
                    ?.querySelector<HTMLButtonElement>("[role=combobox]")
                    ?.focus();
                }
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  const buttons =
                    root.current?.querySelectorAll<HTMLButtonElement>(
                      "[role=option]",
                    );
                  buttons?.[
                    (i + (e.key === "ArrowDown" ? 1 : -1) + options.length) %
                      options.length
                  ]?.focus();
                }
              }}
            >
              {text}
              {key === value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
      <input
        tabIndex={-1}
        className="account-select-validation"
        aria-label={label}
        value={value}
        required={required}
        onChange={() => {}}
        onInvalid={() => setOpen(true)}
      />
    </div>
  );
}
