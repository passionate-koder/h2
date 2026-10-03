"use client";
import type { ApplicationQuestion } from "@/lib/marketplace/types";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
export function ApplicationForm({ slug, questions, initialAnswers, profile }: { slug: string; questions: ApplicationQuestion[]; initialAnswers: Record<string, string>; profile: { fullName: string; email: string; resumeName: string } }) {
  const [answers, setAnswers] = useState(initialAnswers); const [busy, setBusy] = useState<"draft" | "submit" | null>(null); const [error, setError] = useState(""); const router = useRouter();
  async function save(event: FormEvent, action: "draft" | "submit") { event.preventDefault(); setBusy(action); setError(""); const response = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, answers, action }) }); const data = await response.json(); setBusy(null); if (!response.ok) { setError(data.message || "Unable to save application."); return; } router.push(`/applications/${data.application.id}`); router.refresh(); }
  return <form className="market-form" onSubmit={e => save(e, "submit")}>
    <div className="market-profile-summary"><strong>Applying as {profile.fullName}</strong><span>{profile.email}</span><span>{profile.resumeName ? `Resume: ${profile.resumeName}` : "No resume attached — add one in your profile."}</span></div>
    {questions.map(question => <label key={question.id}>{question.label}{question.required && " *"}
      {question.type === "textarea" ? <textarea required={question.required} value={answers[question.id] || ""} onChange={e => setAnswers({ ...answers, [question.id]: e.target.value })} /> : question.options.length ? <select required={question.required} value={answers[question.id] || ""} onChange={e => setAnswers({ ...answers, [question.id]: e.target.value })}><option value="">Select</option>{question.options.map(option => <option key={option}>{option}</option>)}</select> : <input type={question.type === "url" ? "url" : question.type === "number" ? "number" : "text"} required={question.required} value={answers[question.id] || ""} onChange={e => setAnswers({ ...answers, [question.id]: e.target.value })} />}
    </label>)}
    {error && <p className="market-error" role="alert">{error}</p>}
    <div className="market-actions"><button className="market-button market-button-secondary" type="button" disabled={!!busy} onClick={e => void save(e, "draft")}>{busy === "draft" ? "Saving…" : "Save draft"}</button><button className="market-button" type="submit" disabled={!!busy}>{busy === "submit" ? "Submitting…" : "Submit application"}</button></div>
  </form>;
}
