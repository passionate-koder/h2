import programs from "@/content/programs.json";
import type { Opportunity, OpportunityType, WorkMode } from "./types";

const stamp = "2026-10-01T00:00:00.000Z";
function stableId(index: number) { return `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`; }
function mode(value: string): WorkMode { return value === "online" ? "remote" : value === "hybrid" ? "hybrid" : "onsite"; }
export function seededOpportunities(): Opportunity[] {
  const organizers = [...new Set(programs.map(program => program.organizer))].sort();
  const imported: Opportunity[] = programs.map((program, index) => ({
    id: stableId(index), slug: program.slug, title: program.name, type: "hackathon" as OpportunityType,
    summary: `${program.name} is a community innovation program hosted by ${program.organizer}.`,
    description: `Build, learn, and collaborate through ${program.name}. Review the schedule and eligibility before registering.`,
    organization: { id: `40000000-0000-4000-8000-${String(organizers.indexOf(program.organizer) + 1).padStart(12, "0")}`, name: program.organizer, slug: program.organizer.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), verified: true },
    status: program.open ? "published" : "closed", category: "innovation", skills: ["Problem Solving", "Teamwork"],
    country: "India", city: program.location.split(",").at(-1)?.trim() || "India", location: program.location, workMode: mode(program.mode),
    duration: "Event", eligibility: {}, deadline: program.open ? program.end : undefined, startAt: program.start, endAt: program.end,
    capacity: program.participants, benefits: ["Mentorship", "Community access", "Participation certificate"],
    faqs: [{ question: "Who can participate?", answer: "Review the published eligibility and registration requirements for this program." }],
    schedule: [{ label: "Program starts", at: program.start }, { label: "Program ends", at: program.end }], questions: [], allowWithdrawal: true,
    publishedAt: stamp, createdAt: stamp, updatedAt: stamp, source: `src/content/programs.json#${program.slug}`,
  }));
  const deadline = "2027-12-31T23:59:59.000Z";
  imported.unshift(
    { id: "20000000-0000-4000-8000-000000000001", slug: "frontend-engineer-buildora", title: "Frontend Engineer", type: "job", summary: "Build accessible product experiences for the Buildora community.", description: "Join a small product team shipping reliable, accessible marketplace tools. You will work across React, TypeScript, design systems, and performance.", organization: { id: "30000000-0000-4000-8000-000000000001", name: "ABCD", slug: "abcd", verified: true }, status: "published", category: "engineering", skills: ["TypeScript", "React", "Accessibility"], country: "India", city: "Bengaluru", location: "Bengaluru, India", workMode: "hybrid", compensationMinMinor: 180000000, compensationMaxMinor: 260000000, currency: "INR", duration: "Full time", eligibility: { requiredSkills: ["TypeScript", "React"] }, deadline, benefits: ["Flexible work", "Learning budget", "Health insurance"], faqs: [{ question: "Is remote work available?", answer: "The team works in a hybrid model with planned collaboration days." }], schedule: [], questions: [{ id: "motivation", label: "Why do you want to join?", type: "textarea", required: true, options: [], order: 0, active: true }, { id: "portfolio", label: "Portfolio or GitHub URL", type: "url", required: false, options: [], order: 1, active: true }], allowWithdrawal: true, publishedAt: stamp, createdAt: stamp, updatedAt: stamp, source: "batch-2-3-seed" },
    { id: "20000000-0000-4000-8000-000000000002", slug: "product-design-intern-buildora", title: "Product Design Intern", type: "internship", summary: "Design thoughtful learning and opportunity discovery journeys.", description: "Partner with product and engineering to research, prototype, and validate inclusive experiences for learners.", organization: { id: "30000000-0000-4000-8000-000000000001", name: "ABCD", slug: "abcd", verified: true }, status: "published", category: "design", skills: ["Figma", "User Research"], country: "India", city: "Remote", location: "India", workMode: "remote", compensationMinMinor: 2500000, compensationMaxMinor: 4000000, currency: "INR", duration: "6 months", eligibility: { learnerSegments: ["student", "recent_graduate"] }, deadline, benefits: ["Mentorship", "Certificate", "Flexible hours"], faqs: [{ question: "Can students apply?", answer: "Yes. Current students and recent graduates are eligible." }], schedule: [], questions: [{ id: "case-study", label: "Share a case study URL", type: "url", required: true, options: [], order: 0, active: true }, { id: "availability", label: "When can you start?", type: "text", required: true, options: [], order: 1, active: true }], allowWithdrawal: true, publishedAt: stamp, createdAt: stamp, updatedAt: stamp, source: "batch-2-3-seed" },
  );
  return imported;
}
