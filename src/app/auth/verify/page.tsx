import { AuthForm } from "@/components/auth-form";
import { identityConfig } from "@/lib/identity/config";
export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <AuthForm initialMode="verify" authMode={identityConfig().mode} initialMessage={error ? "This link is invalid or expired. Request a new email below." : "Verify your email using the link in your inbox."} />;
}
