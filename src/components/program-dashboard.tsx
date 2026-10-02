"use client";
import { useEffect, useState } from "react";
import parse from "html-react-parser";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import screens from "@/content/accounts/dashboard-screens.json";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function ProgramDashboard({
  registrationId,
}: {
  registrationId: string;
}) {
  const router = useRouter(),
    pathname = usePathname(),
    search = useSearchParams();
  const tab = search.get("tab");
  const [resources, setResources] = useState(false),
    [finale, setFinale] = useState(false),
    [description, setDescription] = useState(false),
    [sidebar, setSidebar] = useState(false),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebar(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const key =
    tab === "team-formation"
      ? "team"
      : tab === "events"
        ? "events"
        : tab === "submissions"
          ? finale
            ? "finale"
            : "submissions"
          : resources
            ? "resources"
            : "overview";
  const html = (
    screens[key as keyof typeof screens] || screens.overview
  ).replaceAll("__REGISTRATION_SHORT__", registrationId.slice(0, 12) + "...");
  function action(value: string) {
    if (value === "toggle-sidebar") {
      setSidebar(!sidebar);
      return;
    }
    if (value === "copy") {
      void navigator.clipboard.writeText(registrationId).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
      return;
    }
    if (value === "description") {
      setDescription(true);
      return;
    }
    setSidebar(false);
    setResources(value === "resources");
    setFinale(value === "finale");
    const next =
      value === "team"
        ? "team-formation"
        : ["submissions", "finale"].includes(value)
          ? "submissions"
          : value === "events"
            ? "events"
            : "";
    router.push(pathname + (next ? "?tab=" + next : ""), { scroll: false });
  }
  return (
    <div
      className={`hc-dashboard ${sidebar ? "sidebar-open" : ""}`}
      onClick={(event) => {
        const button = (event.target as Element).closest("[data-action]");
        if (button) action(button.getAttribute("data-action")!);
      }}
    >
      {sidebar && (
        <button
          className="dashboard-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebar(false)}
        />
      )}
      {sidebar && (
        <button
          className="dashboard-expand"
          aria-label="Expand sidebar"
          onClick={() => setSidebar(false)}
        >
          ☰
        </button>
      )}
      {parse(html)}
      {copied && (
        <div role="status" className="dashboard-toast">
          Registration ID copied
        </div>
      )}
      <Dialog open={description} onOpenChange={setDescription}>
        <DialogContent>
          <DialogTitle>
            {finale
              ? "Grand Finale | Mentorship & Presentations"
              : "Submission Phase"}
          </DialogTitle>
          <p>Elimination Round</p>
          {finale ? (
            <p>
              The Top 20 teams will build further and receive mentorship at
              Cloud Community Days on 23rd October. The Top 10 teams will
              present their solutions at DevFest on 24th October.
            </p>
          ) : (
            <>
              <p>
                Submit your fully completed project for this elimination round
                along with your project presentation (PPT) and GitHub repository
                containing the complete project code.
              </p>
              <p>
                The Top 20 teams will be selected based on their submitted
                projects and will advance to the Grand Finale.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
