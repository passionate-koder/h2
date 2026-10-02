import Link from "next/link";

export function AccountFooter() {
  return (
    <footer className="account-footer">
      <div>
        <Link href="/legal/privacy-policy">Privacy Policy</Link>
        <Link href="/legal/terms-and-conditions">Terms &amp; Conditions</Link>
      </div>
      <p>
        © 2026 <Link href="/">Buildora</Link>. All rights reserved.
      </p>
    </footer>
  );
}
