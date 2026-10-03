"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function SaveOpportunity({ slug, initialSaved, signedIn }: { slug: string; initialSaved: boolean; signedIn: boolean }) {
  const [saved, setSaved] = useState(initialSaved); const [busy, setBusy] = useState(false); const router = useRouter();
  async function toggle() { if (!signedIn) { router.push(`/auth?redirect=${encodeURIComponent(`/opportunities/${slug}`)}`); return; } setBusy(true); const response = await fetch(`/api/opportunities/${slug}/save`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ saved: !saved }) }); if (response.ok) setSaved(!saved); setBusy(false); }
  return <button type="button" className="market-button market-button-secondary" disabled={busy} aria-pressed={saved} onClick={toggle}>{busy ? "Saving…" : saved ? "Saved" : "Save opportunity"}</button>;
}
export function ApplicationActions({ id, canWithdraw }: { id: string; canWithdraw: boolean }) {
  const [busy, setBusy] = useState(false); const router = useRouter();
  if (!canWithdraw) return null;
  return <button className="market-button market-button-danger" disabled={busy} onClick={async () => { setBusy(true); const response = await fetch(`/api/applications/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "withdraw" }) }); setBusy(false); if (response.ok) router.refresh(); }}>{busy ? "Withdrawing…" : "Withdraw application"}</button>;
}
