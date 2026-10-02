"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  UserCircle,
  GraduationCap,
  Phone,
  MapPin,
  CalendarDays,
  Mail,
  Clock,
  Megaphone,
  Fingerprint,
  Copy,
  CheckCircle2,
  Star,
  ShieldCheck,
  FileText,
  CalendarPlus,
  KeyRound,
  LogOut,
  ChevronRight,
  Pencil,
  Plus,
  Briefcase,
  Link as LinkIcon,
} from "lucide-react";
import type { AccountProfile } from "@/lib/account-types";
import { useAccount } from "@/components/account-provider";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
export function ProfilePage({
  initialProfile,
}: {
  initialProfile: AccountProfile;
}) {
  const account = useAccount();
  const profile = account.user || initialProfile;
  const [contact, setContact] = useState(false);
  const [copied, setCopied] = useState(false);
  const initials = profile.fullName
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("");
  const student = profile.profileType === "student";
  const date = (value: string) =>
    new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  const row = (
    icon: ReactNode,
    title: string,
    detail?: string,
    href?: string,
    action?: () => void,
    extra?: ReactNode,
  ) => {
    const body = (
      <>
        <span className="account-row-icon">{icon}</span>
        <span className="account-row-copy">
          <strong>{title}</strong>
          {detail && (
            <small className={detail === "Verified" ? "account-verified" : ""}>
              {detail}
            </small>
          )}
        </span>
        {extra ||
          ((href || action) && (
            <ChevronRight size={17} className="account-row-arrow" />
          ))}
      </>
    );
    return href ? (
      <Link className="account-settings-row" href={href}>
        {body}
      </Link>
    ) : action ? (
      <button className="account-settings-row" onClick={action}>
        {body}
      </button>
    ) : (
      <div className="account-settings-row">{body}</div>
    );
  };
  return (
    <main id="page-content" className="account-profile-page">
      <article className="account-profile-card">
        <div className="account-profile-cover" />
        <div className="account-profile-identity">
          <div className="account-profile-avatar">{initials}</div>
          <div className="account-profile-name">
            <h1>{profile.fullName}</h1>
            <p>
              {profile.email}
              <ShieldCheck size={17} fill="#00d974" color="white" />
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/onboarding?edit=true&step=1">
              <Pencil size={16} />
              Edit Profile
            </Link>
          </Button>
        </div>
        <div className="account-profile-body">
          <div className="account-facts">
            {[
              [
                <UserCircle key="gender" />,
                "Gender",
                profile.gender[0].toUpperCase() + profile.gender.slice(1),
              ],
              [
                <GraduationCap key="type" />,
                "Profile",
                student ? "Student" : "Working Professional",
              ],
              [
                <Phone key="phone" />,
                "Phone",
                profile.phone.replace(/^(\+\d{2})(\d{10})$/, "$1 $2"),
              ],
              [<MapPin key="city" />, "Current City", profile.city],
            ].map(([icon, label, value]) => (
              <div className="account-fact" key={String(label)}>
                <span>{icon}</span>
                <div>
                  <strong>{label}</strong>
                  <small>{value}</small>
                </div>
              </div>
            ))}
          </div>
          <section className="account-background">
            <h2>
              {student
                ? "Education"
                : profile.professionalCategory
                    .replaceAll("_", " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
            </h2>
            <div>
              <span className="account-organization-icon">
                {(student ? profile.college : profile.organization)
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div>
                <h3>
                  {student
                    ? `${profile.college}, ${profile.collegeCity}`
                    : profile.organization}
                </h3>
                {student ? (
                  <>
                    <p>
                      <GraduationCap size={16} />
                      {profile.degree} • {profile.yearOfStudy}
                      {profile.yearOfStudy === "1"
                        ? "st"
                        : profile.yearOfStudy === "2"
                          ? "nd"
                          : profile.yearOfStudy === "3"
                            ? "rd"
                            : "th"}{" "}
                      Year
                    </p>
                    <p>
                      <CalendarDays size={16} />
                      {Number(profile.graduationYear) - 4} -{" "}
                      {profile.graduationYear} Graduation Year
                    </p>
                  </>
                ) : (
                  <>
                    {profile.jobTitle && (
                      <p>
                        <Briefcase size={16} />
                        {profile.jobTitle}
                      </p>
                    )}
                    {profile.website && (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {profile.website}
                      </a>
                    )}
                    {profile.pitch && <p>{profile.pitch}</p>}
                  </>
                )}
              </div>
            </div>
            {profile.resumeName && (
              <a
                className="account-resume-link"
                href={profile.resumeData}
                download={profile.resumeName}
              >
                <FileText size={16} />
                {profile.resumeName}
              </a>
            )}
          </section>
          <section className="account-profile-section">
            <h2>Skills</h2>
            <div
              className={
                profile.skills.length
                  ? "account-skill-list"
                  : "account-section-empty"
              }
            >
              {profile.skills.map((skill) => (
                <span className="account-skill-pill" key={skill}>
                  {skill}
                </span>
              ))}
              <Link
                className="account-add-pill"
                href="/onboarding?edit=true&step=3"
              >
                <Plus size={13} />
                Add skill
              </Link>
            </div>
          </section>
          <section className="account-profile-section">
            <h2>Social Links</h2>
            <div
              className={
                Object.values(profile.links).some(Boolean)
                  ? "account-skill-list"
                  : "account-section-empty"
              }
            >
              {Object.entries(profile.links)
                .filter(([, value]) => value)
                .map(([key, value]) => (
                  <a
                    key={key}
                    href={value}
                    target="_blank"
                    rel="noreferrer"
                    className="account-add-pill"
                  >
                    <LinkIcon size={14} />
                    {key === "other" ? "Portfolio" : key}
                  </a>
                ))}
              <Link
                className="account-add-pill"
                href="/onboarding?edit=true&step=3"
              >
                <Plus size={13} />
                Add link
              </Link>
            </div>
          </section>
          <section className="account-profile-section account-settings">
            <h2>Settings</h2>
            <div className="account-settings-columns">
              <div className="account-settings-box">
                <h3>Your account</h3>
                {row(
                  <CalendarDays size={17} />,
                  "My Programs",
                  "All your registered programs",
                  "/my-events",
                )}
                {row(
                  <CheckCircle2 size={17} color="#00be66" />,
                  "Email Status",
                  "Verified",
                )}
                {row(
                  <CalendarDays size={17} />,
                  "Member Since",
                  date(profile.createdAt),
                )}
                {row(
                  <Clock size={17} />,
                  "Last Updated",
                  date(profile.updatedAt),
                )}
                {row(
                  <Mail size={17} />,
                  "Transactional emails",
                  profile.transactional ? "On" : "Off",
                )}
                {row(
                  <Megaphone size={17} />,
                  "Promotional emails",
                  profile.promotional ? "On" : "Off",
                )}
                {row(
                  <Fingerprint size={17} />,
                  "User ID",
                  profile.uid,
                  undefined,
                  undefined,
                  <button
                    aria-label="Copy user ID"
                    onClick={async () => {
                      await navigator.clipboard.writeText(profile.uid);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <CheckCircle2 size={17} /> : <Copy size={17} />}
                  </button>,
                )}
              </div>
              <div className="account-settings-right">
                <div className="account-settings-box">
                  <h3>Company</h3>
                  {row(
                    <Star size={17} />,
                    "Rate us",
                    undefined,
                    "https://share.google/PAUjqDBtJIYpE6Uje",
                  )}
                  {row(
                    <ShieldCheck size={17} />,
                    "Privacy Policy",
                    undefined,
                    "/legal/privacy-policy",
                  )}
                  {row(
                    <FileText size={17} />,
                    "Terms of Use",
                    undefined,
                    "/legal/terms-and-conditions",
                  )}
                  {row(
                    <Mail size={17} />,
                    "Contact us",
                    undefined,
                    undefined,
                    () => setContact(true),
                  )}
                </div>
                <div className="account-settings-box">
                  <h3>Actions</h3>
                  {row(
                    <CalendarPlus size={17} />,
                    "Host event",
                    undefined,
                    "/host",
                  )}
                  {row(
                    <KeyRound size={17} />,
                    "Reset password",
                    undefined,
                    "/auth/reset-password",
                  )}
                  {row(
                    <LogOut size={17} color="#ff4f68" />,
                    "Logout",
                    undefined,
                    undefined,
                    account.logout,
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </article>
      <Dialog open={contact} onOpenChange={setContact}>
        <DialogContent>
          <DialogTitle>Contact Us</DialogTitle>
          <DialogDescription>Get in touch with us</DialogDescription>
          <p className="mt-6 mb-6">
            For any queries or issues on platform, contact us at
          </p>
          <div className="account-contact-details">
            <small>EMAIL</small>
            <a href="/host">Buildora support</a>
            <small>PHONE</small>
            <a href="tel:+918121736459">+91 81217 36459</a>
          </div>
          <Button asChild className="mt-6">
            <a
              href="https://api.whatsapp.com/send?phone=918121736459"
              target="_blank"
              rel="noreferrer"
            >
              Message on WhatsApp
            </a>
          </Button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
