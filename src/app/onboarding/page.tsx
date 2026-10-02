import { redirect } from "next/navigation";
import { getAccountRole, readAccount } from "@/lib/accounts";
import { OnboardingEditor } from "@/components/onboarding-editor";
export const metadata = { title: "Edit Profile" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const role = await getAccountRole();
  if (!role) redirect("/auth?redirect=/onboarding");
  const query = await searchParams;
  return (
    <OnboardingEditor
      initialProfile={(await readAccount(role)).profile}
      initialStep={Math.min(4, Math.max(1, Number(query.step) || 1))}
    />
  );
}
