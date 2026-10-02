"use client";
import Link from "next/link";
import { useState, type CSSProperties, type FormEvent } from "react";
import { FolderOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AccountProfile, RegistrationProgram } from "@/lib/account-types";
import { AccountFooter } from "./account-footer";
import { Button } from "./ui/button";
function Description({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <p className="account-question-description">
      {(expanded ? text : text.slice(0, 180))
        .split(/(https?:\/\/[^\s)]+)/g)
        .map((part, i) =>
          part.startsWith("http") ? (
            <a key={i} href={part} target="_blank" rel="noreferrer">
              {part}
            </a>
          ) : (
            part
          ),
        )}
      {text.length > 180 && (
        <button type="button" onClick={() => setExpanded(!expanded)}>
          {expanded ? " Read less" : "… Read more"}
        </button>
      )}
    </p>
  );
}
export function RegistrationForm({
  profile,
  program,
}: {
  profile: AccountProfile;
  program: RegistrationProgram;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      program.questions.map((q) => [
        q.id,
        q.get_from_profile_key === "student_details.college_name"
          ? profile.college
          : q.get_from_profile_key?.startsWith("links.")
            ? profile.links[q.get_from_profile_key.split(".")[1]] || ""
            : "",
      ]),
    ),
  );
  const [share, setShare] = useState(true);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const progress = Math.round(
    ((2 +
      Number(share) +
      Number(consent) +
      Object.values(answers).filter(Boolean).length) /
      (program.questions.length + 4)) *
      100,
  );
  const change = (id: string, value: string) =>
    setAnswers((old) => ({ ...old, [id]: value }));
  async function file(id: string, f?: File) {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError("Please select a file smaller than 5 MB.");
      return;
    }
    change(id, f.name);
    setError("");
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: program.slug, answers, consent, share }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      router.push("/my-events/manage/"+data.id);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <main
        id="page-content"
        className="account-registration-page"
        style={{ "--event-color": program.color } as CSSProperties}
      >
        <div className="account-registration-heading">
          <div>
            <h1 title={program.name}>{program.name}</h1>
            <span>{program.participants} Registered</span>
            <p>{program.tagline}</p>
          </div>
          <div className="account-progress">
            <strong>Registration Progress</strong>
            <div>
              <i style={{ width: `${progress}%` }} />
            </div>
            <small>{progress}%</small>
          </div>
        </div>
        <form onSubmit={submit}>
          <div className="account-fields">
            <label className="account-field">
              Full Name
              <input disabled value={profile.fullName} />
            </label>
            <label className="account-field">
              Email
              <input disabled value={profile.email} />
            </label>
          </div>
          <label className="account-registration-check">
            <input
              type="checkbox"
              required
              checked={share}
              onChange={(e) => setShare(e.target.checked)}
            />
            <span>
              I agree to share my{" "}
              <Link href="/profile" target="_blank">
                profile
              </Link>{" "}
              with the organizers.
            </span>
          </label>
          <hr />
          {program.questions.map((q, index) => (
            <div className="account-question" key={q.id}>
              <label htmlFor={`question-${q.id}`}>
                <b>{index + 1}</b>
                {q.label}
                {q.required && <span>*</span>}
              </label>
              {q.description && <Description text={q.description} />}{" "}
              {q.type === "select" ? (
                <select
                  id={`question-${q.id}`}
                  value={answers[q.id]}
                  required={q.required}
                  onChange={(e) => change(q.id, e.target.value)}
                >
                  <option value="">Select an option</option>
                  {q.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : q.type === "radio" ? (
                <div className="account-radio-options">
                  {q.options.map((o) => (
                    <label key={o}>
                      <input
                        type="radio"
                        required={q.required}
                        name={q.id}
                        checked={answers[q.id] === o}
                        onChange={() => change(q.id, o)}
                      />
                      {o}
                    </label>
                  ))}
                </div>
              ) : q.type === "file" ? (
                <label
                  className="account-upload"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    void file(q.id, e.dataTransfer.files[0]);
                  }}
                >
                  <FolderOpen size={30} />
                  <span>
                    {answers[q.id] || "Drag & drop your file here or "}
                    <b>{answers[q.id] ? "Replace" : "select here"}</b>
                  </span>
                  <input
                    id={`question-${q.id}`}
                    type="file"
                    required={q.required && !answers[q.id]}
                    onChange={(e) => void file(q.id, e.target.files?.[0])}
                  />
                </label>
              ) : q.type === "textarea" ? (
                <textarea
                  id={`question-${q.id}`}
                  required={q.required}
                  value={answers[q.id]}
                  onChange={(e) => change(q.id, e.target.value)}
                />
              ) : (
                <input
                  id={`question-${q.id}`}
                  type={q.type === "url" ? "url" : "text"}
                  required={q.required}
                  value={answers[q.id]}
                  onChange={(e) => change(q.id, e.target.value)}
                />
              )}
            </div>
          ))}
          <label className="account-registration-check">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              I agree to the{" "}
              <Link href="/legal/terms-and-conditions">
                Terms &amp; Conditions
              </Link>{" "}
              and <Link href="/legal/privacy-policy">Privacy Policy</Link> and
              consent to sharing my registration information with the
              organizers.
            </span>
          </label>
          {error && (
            <p role="alert" className="account-error">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={busy}
            style={{ background: program.color }}
          >
            {busy ? "Submitting…" : "Complete Registration"}
          </Button>
        </form>
      </main>
      <AccountFooter />
    </>
  );
}
