"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccount } from "./account-provider";
import Link from "next/link";
import { Check } from "lucide-react";
type Draft = {
  name: string;
  email: string;
  phone: string;
  country: string;
  organizationType: string;
  organization: string;
  designation: string;
  programType: string;
  details: string;
};
const empty: Draft = {
  name: "",
  email: "",
  phone: "",
  country: "+91",
  organizationType: "",
  organization: "",
  designation: "",
  programType: "",
  details: "",
};
export function HostForm() {
  const { user } = useAccount();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(empty);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const draftKey = "hc-host-draft-" + (user?.role || "guest");
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(draftKey);
      setDraft(saved ? { ...empty, ...JSON.parse(saved) } : empty);
    } catch {}
  }, [draftKey]);
  function update(key: keyof Draft, value: string) {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      sessionStorage.setItem(draftKey, JSON.stringify(next));
      return next;
    });
  }
  async function next(e: FormEvent) {
    e.preventDefault();
    if (step < 2) {
      setStep(step + 1);
      setMessage("");
    } else {
      setBusy(true);
      setMessage("");
      try {
        const response = await fetch("/api/host", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        setSubmitted(true);
        sessionStorage.removeItem(draftKey);
      } catch (error) {
        setMessage((error as Error).message);
      } finally {
        setBusy(false);
      }
    }
  }
  const field = (
    key: keyof Draft,
    label: string,
    placeholder: string,
    type = "text",
  ) => (
    <div className="hc-field hc-host-field">
      <label htmlFor={"host-" + key}>{label}</label>
      <input
        id={"host-" + key}
        type={type}
        value={draft[key]}
        placeholder={placeholder}
        required
        onChange={(e) => update(key, e.target.value)}
      />
    </div>
  );
  if (submitted)
    return (
      <div className="py-10 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <Check size={26} />
        </span>
        <h1 className="text-xl font-bold">We&apos;ve received your request</h1>
        <p className="mt-2 text-gray-600">
          Our team will reach out shortly
          <br />
          to discuss about your hackathon.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-6 rounded-full bg-primary px-5 py-2 text-white font-semibold shadow"
        >
          Back to Home <ArrowRight size={17} />
        </Link>
      </div>
    );
  return (
    <form onSubmit={next}>
      {step > 0 && (
        <button
          type="button"
          aria-label="Previous step"
          onClick={() => setStep(step - 1)}
          className="mb-3 text-gray-500"
        >
          <ArrowLeft size={18} />
        </button>
      )}
      <h1 className="text-[1.375rem] lg:text-2xl leading-tight font-bold tracking-tight text-black">
        {["Host Program", "Your organization", "Your program"][step]}
      </h1>
      <p className="mt-1 text-sm leading-snug text-gray-600 lg:mt-1.5 lg:text-[15px]">
        {
          [
            "Tell us how to reach you so we can set up a short conversation.",
            "A few details so we can prepare for your team and goals.",
            "Which program are you looking to host?",
          ][step]
        }
      </p>
      <div className="mt-5 lg:mt-7">
        {step === 0 && (
          <>
            {field("name", "YOUR NAME", "Your full name")}
            {field("email", "EMAIL", "you@company.com", "email")}
            <div className="hc-field hc-host-field">
              <label htmlFor="host-phone">PHONE NUMBER</label>
              <div className="flex">
                <select
                  aria-label="Country calling code"
                  value={draft.country}
                  onChange={(e) => update("country", e.target.value)}
                  style={{ width: 106, borderRadius: "13px 0 0 13px" }}
                >
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+65">🇸🇬 +65</option>
                  <option value="+61">🇦🇺 +61</option>
                </select>
                <input
                  id="host-phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="9876543210"
                  pattern="[0-9 ()+-]{7,16}"
                  value={draft.phone}
                  required
                  onChange={(e) => update("phone", e.target.value)}
                  style={{ borderRadius: "0 13px 13px 0" }}
                />
              </div>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <div className="hc-field hc-host-field">
              <label htmlFor="organization-type">YOU REPRESENT</label>
              <select
                id="organization-type"
                value={draft.organizationType}
                required
                onChange={(e) => update("organizationType", e.target.value)}
              >
                <option value="" disabled>
                  Select organization type
                </option>
                {["Corporate / Enterprise", "University", "Community"].map(
                  (v) => (
                    <option key={v}>{v}</option>
                  ),
                )}
              </select>
            </div>
            {field(
              "organization",
              draft.organizationType === "Corporate / Enterprise"
                ? "COMPANY NAME"
                : "ORGANIZATION NAME",
              draft.organizationType === "Corporate / Enterprise"
                ? "e.g. Your company name"
                : "e.g. Your organization name",
            )}
            {field(
              "designation",
              draft.organizationType === "Corporate / Enterprise"
                ? "JOB TITLE"
                : "DESIGNATION",
              draft.organizationType === "Corporate / Enterprise"
                ? "e.g. Head of Innovation"
                : "e.g. Program Lead",
            )}
          </>
        )}
        {step === 2 && (
          <>
            <div className="hc-field hc-host-field">
              <label htmlFor="program-type">PROGRAM INTEREST</label>
              <select
                id="program-type"
                value={draft.programType}
                required
                onChange={(e) => update("programType", e.target.value)}
              >
                <option value="" disabled>
                  Select a program
                </option>
                {[
                  "Hackathon - hiring, crowdsourcing, product adoption",
                  "Innovation Challenge - solve real world problems",
                  "Startup Challenge - pitch, validate, and scale",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="hc-field hc-host-field">
              <label htmlFor="program-details">OPTIONAL MESSAGE</label>
              <textarea
                id="program-details"
                placeholder="Anything we should know before we connect?"
                value={draft.details}
                onChange={(e) => update("details", e.target.value)}
              />
            </div>
          </>
        )}
      </div>
      <Button className="hc-host-submit" type="submit" disabled={busy}>
        {busy ? "Submitting…" : step < 2 ? "Continue" : "Submit"}
        <ArrowRight size={17} />
      </Button>
      {message && (
        <p className="hc-form-message" role="status">
          {message}
        </p>
      )}
      <div className="hc-host-dots" aria-label={`Step ${step + 1} of 3`}>
        {[0, 1, 2].map((n) => (
          <span key={n} className={step === n ? "active" : ""} />
        ))}
      </div>
    </form>
  );
}
