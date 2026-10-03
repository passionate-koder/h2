import { AuthForm } from "@/components/auth-form";
import { identityConfig } from "@/lib/identity/config";
export default function Page() { return <AuthForm initialMode="update-password" authMode={identityConfig().mode} />; }
