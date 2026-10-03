import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
const programs = JSON.parse(await fs.readFile("src/content/programs.json", "utf8"));
const stamp = "2026-10-01T00:00:00.000Z";
const stableId = index => `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
const slugify = value => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const organizers = [...new Set(programs.map(program => program.organizer))].sort();
const opportunities = programs.map((program, index) => ({ id: stableId(index), slug: program.slug, title: program.name, type: "hackathon", summary: `${program.name} is a community innovation program hosted by ${program.organizer}.`, description: `Build, learn, and collaborate through ${program.name}. Review the schedule and eligibility before registering.`, organization: { id: `40000000-0000-4000-8000-${String(organizers.indexOf(program.organizer) + 1).padStart(12, "0")}`, name: program.organizer, slug: slugify(program.organizer), verified: true }, status: program.open ? "published" : "closed", category: "innovation", skills: ["Problem Solving", "Teamwork"], country: "India", city: program.location.split(",").at(-1)?.trim() || "India", location: program.location, workMode: program.mode === "online" ? "remote" : program.mode === "hybrid" ? "hybrid" : "onsite", duration: "Event", eligibility: {}, deadline: program.open ? program.end : undefined, startAt: program.start, endAt: program.end, capacity: program.participants, benefits: ["Mentorship", "Community access", "Participation certificate"], faqs: [{ question: "Who can participate?", answer: "Review the published eligibility and registration requirements for this program." }], schedule: [{ label: "Program starts", at: program.start }, { label: "Program ends", at: program.end }], questions: [], allowWithdrawal: true, publishedAt: stamp, createdAt: stamp, updatedAt: stamp, source: `src/content/programs.json#${program.slug}` }));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(); const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (url && serviceKey) {
  const client = createClient(url, serviceKey, { auth: { persistSession: false } });
  for (const item of opportunities) {
    const org = await client.from("organizations").upsert({ id: item.organization.id, slug: item.organization.slug, name: item.organization.name, verified: item.organization.verified }, { onConflict: "id" }).select("id").single(); if (org.error) throw org.error;
    const row = { id: item.id, organization_id: org.data.id, slug: item.slug, title: item.title, type: item.type, summary: item.summary, description: item.description, status: item.status, category: item.category, country: item.country, city: item.city, location: item.location, work_mode: item.workMode, duration: item.duration, eligibility: item.eligibility, deadline: item.deadline || null, start_at: item.startAt, end_at: item.endAt, capacity: item.capacity, benefits: item.benefits, faqs: item.faqs, schedule: item.schedule, allow_withdrawal: item.allowWithdrawal, published_at: item.publishedAt, source: item.source };
    const saved = await client.from("opportunities").upsert(row, { onConflict: "slug" }); if (saved.error) throw saved.error;
    await client.from("opportunity_skills").delete().eq("opportunity_id", item.id); const skills = await client.from("opportunity_skills").insert(item.skills.map(name => ({ opportunity_id: item.id, name }))); if (skills.error) throw skills.error;
  }
  console.log(`Imported ${opportunities.length} opportunities to Supabase (idempotent by slug).`);
} else {
  const directory = path.resolve(process.env.BUILDORA_LOCAL_DATA_DIR || ".local-data"); await fs.mkdir(directory, { recursive: true }); const target = path.join(directory, "opportunities-import.json"); await fs.writeFile(target, JSON.stringify(opportunities, null, 2), { mode: 0o600 }); console.log(`Imported ${opportunities.length} opportunities to ${target} (replaced atomically by source identity).`);
}
