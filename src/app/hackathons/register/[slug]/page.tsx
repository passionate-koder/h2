import { redirect, notFound } from "next/navigation";
import { getAccountRole, readAccount } from "@/lib/accounts";
import programs from "@/content/accounts/registration-programs.json";
import { RegistrationForm } from "@/components/registration-form";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const role = await getAccountRole();
  if (!role) redirect(`/auth?redirect=/hackathons/register/${slug}`);
  const program = programs.find((p) => p.slug === slug);
  if (!program) notFound();
  const account=await readAccount(role);
  const existing=account.registrations.find(r=>r.slug===slug);
  if(existing)redirect('/my-events/manage/'+(existing.id||existing.slug));
  return (
    <RegistrationForm
      profile={account.profile}
      program={program}
    />
  );
}
