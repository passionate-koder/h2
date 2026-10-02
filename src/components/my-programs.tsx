"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Registration } from "@/lib/account-types";
import programs from "@/content/programs.json";
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Grid2X2,
  List,
} from "lucide-react";
export function MyPrograms({
  registrations,
}: {
  registrations: Registration[];
}) {
  const [query, setQuery] = useState(""),
    [view, setView] = useState("grid"),
    [sort, setSort] = useState("newest"),
    [filter, setFilter] = useState("all"),
    [sortOpen, setSortOpen] = useState(false),
    [filterOpen, setFilterOpen] = useState(false),
    [type, setType] = useState("all"),
    [participation, setParticipation] = useState("all");
  const rows = useMemo(
    () =>
      registrations
        .filter(
          (r) =>
            r.name.toLowerCase().includes(query.toLowerCase()) &&
            (filter === "all" || filter === "ongoing") &&
            (type === "all" || type === "hackathon") &&
            participation !== "team",
        )
        .sort((a, b) =>
          sort === "name"
            ? a.name.localeCompare(b.name)
            : sort === "start" || sort === "end"
              ? (
                  programs.find((p) => p.slug === a.slug)?.[sort] || ""
                ).localeCompare(
                  programs.find((p) => p.slug === b.slug)?.[sort] || "",
                )
              : b.registeredAt.localeCompare(a.registeredAt),
        ),
    [registrations, query, sort, filter, type, participation],
  );
  const date = (value: string) =>
    new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  const image = (slug: string) => programs.find((p) => p.slug === slug)?.cover;
  return (
    <div className="program-records">
      <div className="program-tools">
        <Search size={20} />
        <input
          aria-label="Search programs"
          placeholder="Search programs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button onClick={() => setSortOpen(!sortOpen)} aria-expanded={sortOpen}>
          <ArrowUpDown size={16} className="inline" /> Sort
        </button>
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          aria-expanded={filterOpen}
        >
          <SlidersHorizontal size={16} className="inline" /> Filters
        </button>
        <button onClick={() => setView("grid")} aria-pressed={view === "grid"}>
          <Grid2X2 size={16} className="inline" /> Grid
        </button>
        <button
          onClick={() => setView("table")}
          aria-pressed={view === "table"}
        >
          <List size={16} className="inline" /> Table
        </button>
      </div>
      {(sortOpen || filterOpen) && (
        <div className="program-tools program-filter-panel">
          {sortOpen && (
            <label>
              Sort programs{" "}
              <select
                aria-label="Sort programs"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="name">Hackathon Name</option>
                <option value="start">Start Date</option>
                <option value="end">End Date</option>
                <option value="newest">Registered Date</option>
              </select>
            </label>
          )}
          {filterOpen && (
            <>
              <label>
                Status{" "}
                <select
                  aria-label="Program status"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="ended">Ended</option>
                </select>
              </label>
              <label>
                Type{" "}
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="all">All Types</option>
                  <option value="hackathon">Hackathon</option>
                  <option value="innovation">Innovation Challenge</option>
                  <option value="startup">Startup Challenge</option>
                </select>
              </label>
              <label>
                Participation{" "}
                <select
                  value={participation}
                  onChange={(e) => setParticipation(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="individual">Individual</option>
                  <option value="team">Team</option>
                </select>
              </label>
            </>
          )}
          <button
            onClick={() => {
              setSort("newest");
              setFilter("all");
              setType("all");
              setParticipation("all");
              setQuery("");
            }}
          >
            Reset
          </button>
        </div>
      )}
      {rows.length === 0 ? (
        <p className="py-16 text-center text-gray-500">
          No programs found. Try adjusting your search or filters.
        </p>
      ) : view === "grid" ? (
        <div className="program-grid">
          {rows.map((r) => (
            <article className="program-record" key={r.slug}>
              <div className="program-record-cover">
                {image(r.slug) && <img src={image(r.slug)} alt={r.name} />}
                <small>
                  {r.slug === "code-for-communities-chandigarh"
                    ? "Sep 29 - Oct 24"
                    : "Sep 17 - Nov 1"}
                </small>
              </div>
              <div className="program-record-body">
                <div className="program-record-title">
                  <h2 title={r.name}>{r.name}</h2>
                  <span className="program-status">Ongoing</span>
                </div>
                <p>Registered on {date(r.registeredAt)}</p>
                <Link href={"/my-events/manage/" + (r.id || r.slug)}>
                  Manage Hackathon →
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="program-table-wrap">
          <table className="program-table">
            <thead>
              <tr>
                <th>#</th>
                <th>PROGRAM</th>
                <th>PARTICIPATION</th>
                <th>DATES</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.slug}>
                  <td>{i + 1}</td>
                  <td>{r.name}</td>
                  <td>Individual</td>
                  <td>
                    {r.slug === "code-for-communities-chandigarh"
                      ? "Sep 29, 2026 - Oct 24, 2026"
                      : "Sep 17, 2026 - Nov 1, 2026"}
                  </td>
                  <td>
                    <span className="program-status">Ongoing</span>
                  </td>
                  <td>
                    <Link href={"/my-events/manage/" + (r.id || r.slug)}>
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="program-pagination">
        <p>
          Showing {rows.length ? 1 : 0} to {rows.length} of {rows.length}
        </p>
        <div>
          <button disabled>Previous</button>
          <button disabled>Page 1</button>
          <button disabled>Next</button>
        </div>
      </div>
    </div>
  );
}
