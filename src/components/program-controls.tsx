"use client";
import { useState } from "react";
import { ArrowUpNarrowWide, ChevronDown, Filter } from "lucide-react";
const categories = [
  "All Programs",
  "Hackathons",
  "Innovation Challenges",
  "Startup Challenges",
];
export function ProgramControl({
  kind,
  className,
}: {
  kind: "category" | "sort" | "filter";
  className: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(
    kind === "category" ? "All Programs" : kind === "sort" ? "Newest" : "All",
  );
  const options =
    kind === "category"
      ? categories
      : kind === "sort"
        ? ["Newest", "Oldest", "Most Popular"]
        : ["All", "Open", "Closed"];
  return (
    <span className="hc-program-control">
      <button
        type="button"
        className={className}
        aria-label={
          kind === "category"
            ? "Program category"
            : kind === "sort"
              ? "Sort programs"
              : "Filter programs"
        }
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {kind === "category" ? (
          <>
            <span>{value}</span>
            <ChevronDown size={12} />
          </>
        ) : kind === "sort" ? (
          <ArrowUpNarrowWide size={16} />
        ) : (
          <Filter size={16} />
        )}
      </button>
      {open && (
        <>
          <button
            className="hc-menu-backdrop"
            aria-label="Close filter menu"
            onClick={() => setOpen(false)}
          />
          <span className="hc-control-options">
            {options.map((option) => (
              <button
                type="button"
                key={option}
                aria-pressed={value === option}
                onClick={() => {
                  setValue(option);
                  setOpen(false);
                  window.dispatchEvent(
                    new CustomEvent("hc:program-filter", {
                      detail: { [kind === "filter" ? "status" : kind]: option },
                    }),
                  );
                }}
              >
                {option}
              </button>
            ))}
          </span>
        </>
      )}
    </span>
  );
}
