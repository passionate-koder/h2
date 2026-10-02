"use client";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
  type ChangeEvent,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import programs from "@/content/programs.json";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
const ctas =
  /^(For Corporates|Host Event|Book a Call|Book Call|Get a Demo|Get Started|Talk to Us|Contact Us|Schedule a Demo|Request a Demo|Talk to an Expert)$/i;
export function InteractiveSurface({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<{ title: string; text: string } | null>(
    null,
  );
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    root.current?.querySelectorAll("button").forEach((b) => {
      if (!b.textContent?.trim() && !b.getAttribute("aria-label"))
        b.setAttribute(
          "aria-label",
          b.querySelector('[class*="filter"]')
            ? "Filter programs"
            : "More options",
        );
    });
  }, [pathname]);
  function filter(detail: Record<string, string>) {
    window.dispatchEvent(new CustomEvent("hc:program-filter", { detail }));
  }
  function input(e: ChangeEvent<HTMLDivElement>) {
    const target = e.target as HTMLInputElement;
    if (pathname === "/programs" && target.tagName === "INPUT") {
      filter({ query: target.value });
      const label = target.parentElement?.querySelector(
        'span[aria-hidden="true"]',
      ) as HTMLElement | null;
      if (label) label.style.visibility = target.value ? "hidden" : "";
    }
  }
  async function click(e: MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const b = target.closest("button");
    const anchor = target.closest("a");
    if (anchor?.getAttribute("href")?.startsWith("/auth")) return;
    if (!b) {
      const readMore = target.closest(
        '[role="button"], [class*="cursor-pointer"]',
      );
      if (readMore && /Read more/i.test(readMore.textContent || ""))
        setModal({
          title: readMore.querySelector("h3")?.textContent || "Details",
          text: readMore.textContent?.replace("Read more", "") || "",
        });
      return;
    }
    const label = b.textContent?.trim() || "";
    const aria = b.getAttribute("aria-label") || "";
    if (
      b.closest(".hc-featured") ||
      b.closest('[aria-roledescription="carousel"]')
    )
      return;
    if (label === "For Corporates") {
      router.push("/offerings");
      return;
    }
    if (/^Book ?a? ?Call$/i.test(label)) {
      router.push("/host");
      return;
    }
    if (ctas.test(label)) {
      e.preventDefault();
      router.push("/host");
      return;
    }
    if (
      label === "For Innovators" ||
      (label === "View More" && pathname === "/")
    ) {
      router.push("/programs");
      return;
    }
    if (label === "Corporate Innovation Programs" && b.closest("footer")) {
      router.push("/offerings/corporate-innovation-programs");
      return;
    }
    if (/^(Register Now|Apply Now|Join Program|Sign In)$/.test(label)) {
      router.push("/auth?redirect=" + encodeURIComponent(pathname));
      return;
    }
    if (label === "Share") {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setToast("Link copied to clipboard");
      } catch {
        setModal({ title: "Share this program", text: window.location.href });
      }
      return;
    }
    if (
      pathname === "/programs" &&
      [
        "All Programs",
        "Hackathons",
        "Innovation Challenges",
        "Startup Challenges",
      ].includes(label) &&
      !b.closest(".hc-program-control")
    ) {
      filter({ category: label });
      const parent = b.parentElement;
      if (parent) {
        parent.querySelectorAll("button").forEach((el) => {
          el.setAttribute("aria-pressed", String(el === b));
          el.classList.toggle("programs-type-pill-active", el === b);
          el.classList.toggle("hc-filter-active", el === b);
        });
      }
      return;
    }
    if (pathname === "/programs" && label === "More options") {
      return;
    }
    if (/Previous|Next|Go to slide/.test(aria)) {
      const scope =
        b.closest("section") || b.parentElement?.parentElement?.parentElement;
      const track = scope?.querySelector(
        '[style*="translateX"], [style*="translate3d"]',
      ) as HTMLElement | null;
      if (track) {
        const index = Number(track.dataset.slide || 0);
        const next = /Previous/.test(aria)
          ? Math.max(0, index - 1)
          : /Go to slide/.test(aria)
            ? Number(aria.match(/\d+/)?.[0] || 1) - 1
            : (index + 1) % 4;
        track.dataset.slide = String(next);
        track.style.transition = "transform .5s ease";
        track.style.transform = `translateX(-${next * 100}%)`;
      }
      return;
    }
    if (aria === "Add event to calendar") {
      const program = programs.find((p) => pathname.endsWith("/" + p.slug));
      if (!program) return;
      const stamp = (value: string) =>
        new Date(value)
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d{3}Z$/, "Z");
      const escape = (value: string) =>
        value
          .replace(/\\/g, "\\\\")
          .replace(/\n/g, "\\n")
          .replace(/,/g, "\\,")
          .replace(/;/g, "\\;");
      const blob = new Blob(
        [
          "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Buildora//Programs//EN\r\nBEGIN:VEVENT\r\nUID:" +
            program.slug +
            "@Buildora.local\r\nDTSTAMP:" +
            stamp(new Date().toISOString()) +
            "\r\nDTSTART:" +
            stamp(program.start) +
            "\r\nDTEND:" +
            stamp(program.end) +
            "\r\nSUMMARY:" +
            escape(program.name) +
            "\r\nURL:" +
            window.location.href +
            "\r\nEND:VEVENT\r\nEND:VCALENDAR",
        ],
        { type: "text/calendar" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "buildora-event.ics";
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    if (pathname.startsWith("/hackathons/")) {
      const heading = [...(root.current?.querySelectorAll("h2,h3") || [])].find(
        (h) => h.textContent?.trim() === label,
      );
      if (heading && label.length < 30) {
        heading.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      const answer = b.nextElementSibling as HTMLElement | null;
      if (
        answer &&
        (/\?$/.test(label) ||
          b.getAttribute("aria-expanded") !== null ||
          answer.style.height === "0px")
      ) {
        const expanded = b.getAttribute("aria-expanded") === "true";
        b.setAttribute("aria-expanded", String(!expanded));
        answer.setAttribute("aria-hidden", String(expanded));
        answer.style.height = expanded ? "0px" : "auto";
        answer.style.opacity = expanded ? "0" : "1";
        answer.style.overflow = expanded ? "hidden" : "visible";
        answer
          .querySelectorAll(".invisible")
          .forEach((el) => el.classList.remove("invisible"));
        answer.hidden = false;
        return;
      }
    }
  }
  return (
    <div
      ref={root}
      onClick={click}
      onChange={input}
      onSubmit={(e) => {
        if (pathname === "/programs") e.preventDefault();
      }}
    >
      {children}
      {toast && (
        <div className="hc-toast" role="status">
          {toast}
        </div>
      )}
      <Dialog
        open={!!modal}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent>
          <DialogTitle>{modal?.title}</DialogTitle>
          <DialogDescription>{modal?.text}</DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
}
