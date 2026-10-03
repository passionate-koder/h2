"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { AccountProfile } from "@/lib/account-types";
type Session = {
  user: AccountProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AccountProfile | null) => void;
};
const Context = createContext<Session | null>(null);
export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountProfile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const data = await response.json();
      setUser(response.ok ? data.user ?? null : null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);
  const logout = async () => {
    setError("");
    let response: Response;
    try { response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    }); } catch { setError("Unable to sign out. Please try again."); return; }
    if (!response.ok) { setError("Unable to sign out. Please try again."); return; }
    setUser(null);
    sessionStorage.removeItem("hc-profile-draft");
    router.push("/auth");
    router.refresh();
  };
  return (
    <Context.Provider value={{ user, loading, refresh, logout, setUser }}>
      {error && <p role="alert" className="account-error">{error}</p>}
      {children}
    </Context.Provider>
  );
}
export function useAccount() {
  const value = useContext(Context);
  if (!value) throw new Error("AccountProvider is required");
  return value;
}
