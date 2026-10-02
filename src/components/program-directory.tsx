"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, Calendar, MapPin, Users } from "lucide-react";
import programs from "@/content/programs.json";
import { Button } from "@/components/ui/button";
export function ProgramDirectory({ className }: { className: string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Programs");
  const [limit, setLimit] = useState(8);
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("Newest");
  useEffect(() => {
    function filter(e: Event) {
      const d = (e as CustomEvent).detail;
      if (d.query !== undefined) setQuery(d.query);
      if (d.category) setCategory(d.category);
      if (d.status) setStatus(d.status);
      if (d.sort) setSort(d.sort);
      setLimit(8);
    }
    window.addEventListener("hc:program-filter", filter);
    return () => window.removeEventListener("hc:program-filter", filter);
  }, []);
  const filtered = useMemo(
    () =>
      [...programs]
        .sort((a, b) => {
          if (sort === "Most Popular") return b.participants - a.participants;
          if (sort === "Oldest")
            return new Date(a.start).getTime() - new Date(b.start).getTime();
          const rank = (p: typeof a) =>
            p.open ? 0 : new Date(p.end) > new Date("2026-09-30") ? 1 : 2;
          return (
            rank(a) - rank(b) ||
            new Date(b.end).getTime() - new Date(a.end).getTime()
          );
        })
        .filter(
          (p) =>
            `${p.name} ${p.organizer} ${p.location}`
              .toLowerCase()
              .includes(query.toLowerCase()) &&
            (category === "All Programs" ||
              (category === "Hackathons"
                ? p.type === "hackathon"
                : category === "Innovation Challenges"
                  ? p.type === "innovation_challenge"
                  : p.type === "startup_challenge")) &&
            (status === "All" || (status === "Open" ? p.open : !p.open)),
        ),
    [query, category, status, sort],
  );
  const date = (v: string) =>
    new Date(v).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  return (
    <div>
      <div className={className} data-testid="program-grid">
        {filtered.slice(0, limit).map((p) => (
          <Link
            className="group h-full block"
            href={"/hackathons/" + p.slug}
            key={p.slug}
          >
            <article className="bg-white rounded-2xl h-full flex flex-col transform hover:-translate-y-1 transition-all duration-300 border border-gray-200 hover:border-gray-300 overflow-hidden shadow-sm hover:shadow-xl">
              <div className="relative aspect-[16/9] overflow-hidden rounded-t-2xl">
                <img
                  src={p.cover}
                  alt={p.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-gray-900 shadow-md flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-600" />
                  <span className="text-xs font-medium">
                    {date(p.start)} - {date(p.end)}
                  </span>
                </div>
              </div>
              <div className="flex-1 p-2 flex flex-col">
                <h3
                  className="font-bold text-base sm:text-lg text-gray-900 group-hover:text-primary transition-colors truncate mb-1"
                  title={p.name}
                >
                  {p.name}
                </h3>
                <div className="mb-1 flex items-center gap-1.5 min-w-0">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white">
                    {p.logo ? (
                      <img
                        alt=""
                        src={p.logo || undefined}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Building2 size={14} className="text-gray-400" />
                    )}
                  </span>
                  <span className="text-sm text-gray-500 font-medium truncate">
                    {p.organizer}
                  </span>
                </div>
                <div className="mb-2 flex items-center gap-1.5 min-w-0">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center text-gray-600">
                    <MapPin className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-sm text-gray-600 truncate">
                    {p.location}
                  </span>
                </div>
                <div className="mt-auto pt-1 border-t border-gray-100 flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-600 font-medium flex items-center gap-1.5 min-w-0 truncate">
                    <Users className="w-4 h-4 shrink-0" />
                    {p.participants.toLocaleString()} Participants
                  </span>
                  <span
                    className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg font-medium text-white text-sm whitespace-nowrap ${p.open ? "bg-primary" : "bg-gray-400"}`}
                  >
                    {p.open
                      ? "Register Now"
                      : new Date(p.end) > new Date("2026-09-30")
                        ? "Registration Closed"
                        : "Program Ended"}
                  </span>
                </div>
              </div>
            </article>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="hc-empty">
            No programs found. Try another search or category.
          </p>
        )}
      </div>
      {limit < filtered.length && (
        <div className="text-center mt-8">
          <Button variant="outline" onClick={() => setLimit(limit + 8)}>
            View More
          </Button>
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {filtered.length} programs found
      </span>
    </div>
  );
}
