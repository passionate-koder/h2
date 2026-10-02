"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  GraduationCap,
  Link as LinkIcon,
  Mail,
  X,
  Upload,
  ChevronLeft,
  ChevronRight,
  Briefcase,
} from "lucide-react";
import type { AccountProfile } from "@/lib/account-types";
import { useAccount } from "./account-provider";
import { AccountFooter } from "./account-footer";
import { Button } from "./ui/button";
import { AccountSelect } from "./account-select";
export function OnboardingEditor({
  initialProfile,
  initialStep,
}: {
  initialProfile: AccountProfile;
  initialStep: number;
}) {
  const [p, setP] = useState(initialProfile);
  const [step, setStep] = useState(initialStep);
  const [skill, setSkill] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const account = useAccount();
  const student = p.profileType === "student";
  const update = (key: keyof AccountProfile, value: unknown) =>
    setP((old) => ({ ...old, [key]: value }));
  const labels = [
    "Basic Info",
    student ? "Education Details" : "Professional Details",
    "Skills & Links",
    "Communication Preferences",
  ];
  const icons = [User, student ? GraduationCap : Briefcase, LinkIcon, Mail];
  const field = (
    label: string,
    key: keyof AccountProfile,
    placeholder = "",
    required = false,
    type = "text",
  ) => (
    <label className="account-field">
      {label}
      {required && <span> *</span>}
      <div>
        <input
          type={type}
          value={String(p[key] || "")}
          placeholder={placeholder}
          required={required}
          disabled={key === "email"}
          onChange={(e) => update(key, e.target.value)}
        />
        {p[key] && key !== "email" && (
          <button
            type="button"
            aria-label={`Clear ${label}`}
            onClick={() => update(key, "")}
          >
            <X size={15} />
          </button>
        )}
      </div>
    </label>
  );
  const select = (
    label: string,
    key: keyof AccountProfile,
    options: [string, string][],
    required = false,
  ) => (
    <AccountSelect
      label={label}
      value={String(p[key])}
      options={options}
      required={required}
      onChange={(value) => update(key, value)}
    />
  );
  const detail = (
    label: string,
    key: string,
    placeholder: string,
    required = true,
  ) => (
    <label className="account-field">
      {label}
      {required && <span> *</span>}
      <input
        value={p.details[key] || ""}
        required={required}
        placeholder={placeholder}
        onChange={(e) =>
          update("details", { ...p.details, [key]: e.target.value })
        }
      />
    </label>
  );
  const professionalFields = () => {
    switch (p.professionalCategory) {
      case "startup":
        return (
          <>
            {field("Startup Name", "organization", "Enter startup name", true)}
            {field(
              "Startup Website",
              "website",
              "https://yourstartup.com",
              false,
              "url",
            )}
            <label className="account-field account-field-wide">
              Elevator Pitch
              <textarea
                value={p.pitch}
                onChange={(e) => update("pitch", e.target.value)}
                placeholder="Describe your startup in a few sentences..."
              />
            </label>
          </>
        );
      case "corporate":
        return (
          <>
            {field("Company Name", "organization", "Enter company name", true)}
            {field("Role", "jobTitle", "Enter your role", true)}
          </>
        );
      case "self_employed":
        return (
          <label className="account-field account-field-wide">
            Service Offerings
            <textarea
              value={p.details.serviceOfferings || ""}
              onChange={(e) =>
                update("details", {
                  ...p.details,
                  serviceOfferings: e.target.value,
                })
              }
              placeholder="Enter your services separated by commas (e.g., Web Development, UI/UX Design, Consulting)"
            />
          </label>
        );
      case "venture_capitalist":
      case "investor":
        return (
          <>
            {p.professionalCategory === "venture_capitalist" &&
              field("Company Name", "organization", "Enter company name", true)}
            {detail(
              "Investment Sector",
              "investmentSector",
              "Enter investment sector",
            )}
            {detail(
              "Fund Size",
              "fundSize",
              "Enter fund size (e.g., 1,000,000.00)",
            )}
          </>
        );
      case "accelerator":
      case "university":
      case "government":
      case "non_profit":
        return (
          <>
            {field(
              ["accelerator", "university"].includes(p.professionalCategory)
                ? "Institution Name"
                : "Organization Name",
              "organization",
              ["accelerator", "university"].includes(p.professionalCategory)
                ? "Enter institution name"
                : "Enter organization name",
              true,
            )}
            {["accelerator", "non_profit"].includes(p.professionalCategory)
              ? detail("Focus Sector", "focusSector", "Enter focus sector")
              : field("Designation", "jobTitle", "Enter designation", true)}
          </>
        );
      default:
        return null;
    }
  };

  async function save(next: number) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Unable to save your profile.");
      account.setUser(data.user);
      if (next > 4) {
        router.push("/profile");
        router.refresh();
      } else {
        setStep(next);
        window.history.replaceState(
          null,
          "",
          `/onboarding?edit=true&step=${next}`,
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    if (file.type !== "application/pdf" || file.size > 5 * 1024 * 1024) {
      setError("Please choose a PDF file smaller than 5 MB.");
      return;
    }
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    setP((old) => ({ ...old, resumeName: file.name, resumeData: data }));
    setError("");
  }
  return (
    <>
      <main id="page-content" className="account-editor-page">
        <div className="account-editor">
          <aside>
            <header>
              <h1>Edit Profile</h1>
              <p>Update your information</p>
            </header>
            <nav aria-label="Profile steps">
              {labels.map((label, i) => {
                const Icon = icons[i];
                return (
                  <button
                    type="button"
                    key={label}
                    className={step === i + 1 ? "active" : ""}
                    onClick={() => {
                      setStep(i + 1);
                      setError("");
                    }}
                  >
                    <Icon size={20} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void save(step + 1);
            }}
          >
            <button
              type="button"
              className="account-editor-close"
              aria-label="Close edit"
              onClick={() => router.push("/profile")}
            >
              <X size={19} />
            </button>
            <h2>{step === 1 ? "Basic Information" : labels[step - 1]}</h2>
            <p className="account-editor-description">
              {
                [
                  "Let’s start with the basics to get your profile set up.",
                  student
                    ? "Tell us about your academic background."
                    : "Tell us about your work experience.",
                  "Showcase your skills and connect your social profiles.",
                  "Choose how you'd like to receive communications from us.",
                ][step - 1]
              }
            </p>
            {step === 1 && (
              <div className="account-fields">
                {field("Full Name", "fullName", "Enter your full name", true)}
                {field("Email Address", "email", "", true)}
                {select(
                  "You are",
                  "profileType",
                  [
                    ["student", "Student"],
                    ["working_professional", "Working Professional"],
                  ],
                  true,
                )}
                {select(
                  "Gender",
                  "gender",
                  [
                    ["male", "Male"],
                    ["female", "Female"],
                    ["other", "Other"],
                  ],
                  true,
                )}
                {field("Phone Number", "phone", "+91", true, "tel")}
                {field("Current City", "city", "Search your city", true)}
              </div>
            )}
            {step === 2 && (
              <>
                <div className="account-fields">
                  {student ? (
                    <>
                      {field(
                        "College / University Name",
                        "college",
                        "Type to search or enter college name (any college allowed)",
                        true,
                      )}
                      {field(
                        "College City",
                        "collegeCity",
                        "Search or enter college city",
                        true,
                      )}
                      {field(
                        "Degree / Grade",
                        "degree",
                        "e.g. BE, B.Tech, MBA (type to search)",
                        true,
                      )}
                      {select(
                        "Year of Study",
                        "yearOfStudy",
                        Array.from({ length: 6 }, (_, i) => [
                          String(i + 1),
                          `${i + 1}${i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"} Year`,
                        ]),
                        true,
                      )}
                      {select(
                        "Graduation Year",
                        "graduationYear",
                        Array.from({ length: 21 }, (_, i) => [
                          String(2020 + i),
                          String(2020 + i),
                        ]),
                        true,
                      )}
                    </>
                  ) : (
                    <>
                      {select(
                        "Professional Category",
                        "professionalCategory",
                        [
                          ["corporate", "Corporate"],
                          ["startup", "Startup"],
                          ["self_employed", "Self-Employed"],
                          ["venture_capitalist", "Venture Capitalist"],
                          ["investor", "Investor"],
                          ["accelerator", "Accelerator"],
                          ["university", "University"],
                          ["government", "Government"],
                          ["non_profit", "Non-Profit"],
                          ["other", "Other"],
                        ],
                        true,
                      )}
                      <div />
                      {professionalFields()}
                    </>
                  )}
                </div>
                <label className="account-field account-upload-label">
                  Resume <small>(PDF only, max 5MB)</small>
                  <div
                    className="account-upload"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      void upload(e.dataTransfer.files[0]);
                    }}
                  >
                    <Upload size={24} />
                    <span>
                      {p.resumeName || "Drag & drop your resume here or "}
                      <b>{p.resumeName ? "Replace" : "choose"}</b>
                    </span>
                    <input
                      type="file"
                      accept="application/pdf"
                      aria-label="Upload resume"
                      onChange={(e) => void upload(e.target.files?.[0])}
                    />
                  </div>
                </label>
              </>
            )}
            {step === 3 && (
              <>
                <label className="account-field">
                  Technical Skills
                  <div>
                    <input
                      placeholder="Type a skill and press Enter"
                      value={skill}
                      onChange={(e) => setSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (skill.trim() && !p.skills.includes(skill.trim()))
                            update("skills", [...p.skills, skill.trim()]);
                          setSkill("");
                        }
                      }}
                    />
                  </div>
                </label>
                <div className="account-skill-list">
                  {p.skills.map((s) => (
                    <button
                      type="button"
                      className="account-skill-pill"
                      key={s}
                      onClick={() =>
                        update(
                          "skills",
                          p.skills.filter((v) => v !== s),
                        )
                      }
                    >
                      {s}
                      <X size={13} />
                    </button>
                  ))}
                </div>
                <h3 className="account-social-heading">Social Links</h3>
                <div className="account-fields">
                  {[
                    ["linkedin", "LinkedIn"],
                    ["github", "GitHub"],
                    ["twitter", "X / Twitter"],
                    ["facebook", "Facebook"],
                    ["instagram", "Instagram"],
                    ["other", "Portfolio link"],
                  ].map(([key, label]) => (
                    <label key={key} className="account-field">
                      {label}
                      <input
                        type="url"
                        value={p.links[key] || ""}
                        placeholder={
                          key === "other"
                            ? "https://yourwebsite.com"
                            : `https://${key}.com/yourprofile`
                        }
                        onChange={(e) =>
                          update("links", { ...p.links, [key]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                </div>
              </>
            )}
            {step === 4 && (
              <div className="account-preferences">
                {(["transactional", "promotional"] as const).map((key) => (
                  <label key={key}>
                    <div>
                      <strong>
                        {key === "transactional"
                          ? "Transactional emails"
                          : "Promotional emails"}
                      </strong>
                      <p>
                        {key === "transactional"
                          ? "Important updates about your account, program registrations, submissions, and other alerts."
                          : "News about new hackathons, features, partnerships, and other exciting updates from our platform."}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      role="switch"
                      checked={p[key]}
                      onChange={(e) => update(key, e.target.checked)}
                    />
                  </label>
                ))}
              </div>
            )}
            {error && (
              <p role="alert" className="account-error">
                {error}
              </p>
            )}
            <div className="account-editor-actions">
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() =>
                  step === 1 ? router.push("/profile") : setStep(step - 1)
                }
              >
                {step > 1 && <ChevronLeft size={16} />}{" "}
                {step === 1 ? "Cancel" : "Back"}
              </Button>
              <Button size="sm" type="submit" disabled={busy}>
                {busy ? "Saving…" : step === 4 ? "Close Edit" : "Next"}
                {step < 4 && <ChevronRight size={16} />}
              </Button>
            </div>
          </form>
        </div>
      </main>
      <AccountFooter />
    </>
  );
}
