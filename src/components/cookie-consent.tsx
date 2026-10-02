"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(!localStorage.getItem("hc-cookie-consent"));
  }, []);
  function choose(value: string) {
    localStorage.setItem("hc-cookie-consent", value);
    setVisible(false);
  }
  if (!visible) return null;
  return (
    <aside className="hc-cookie" aria-label="Cookie preferences">
      <h2>We value your privacy</h2>
      <p>
        We use cookies to improve your experience, analyze usage, and support
        operations. You can choose what to allow.
      </p>
      <div>
        <Button variant="outline" onClick={() => choose("necessary")}>
          Reject optional
        </Button>
        <Button onClick={() => choose("all")}>Accept all</Button>
      </div>
    </aside>
  );
}
