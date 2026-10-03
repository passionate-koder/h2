"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function EmployerReview({ id }: { id: string }) {
  const [status, setStatus] = useState("reviewing"); const [note, setNote] = useState(""); const [message, setMessage] = useState(""); const router = useRouter();
  async function patch(body: object) { setMessage(""); const response = await fetch(`/api/employer/applications/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const data = await response.json(); setMessage(response.ok ? "Saved." : data.message); if (response.ok) { setNote(""); router.refresh(); } }
  return <div className="employer-controls"><label>Move to<select value={status} onChange={e => setStatus(e.target.value)}><option value="reviewing">Reviewing</option><option value="shortlisted">Shortlisted</option><option value="rejected">Rejected</option><option value="accepted">Accepted</option></select></label><button className="market-button" onClick={() => void patch({ action: "status", status })}>Update status</button><label>Private note<textarea value={note} onChange={e => setNote(e.target.value)} /></label><button className="market-button market-button-secondary" disabled={!note.trim()} onClick={() => void patch({ action: "note", body: note })}>Add private note</button>{message && <small>{message}</small>}</div>;
}
