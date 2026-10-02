import { notFound, redirect } from "next/navigation";
import { getAccountRole, readAccount } from "@/lib/accounts";
import { ProgramDashboard } from "@/components/program-dashboard";
export const metadata = { title: "Program Dashboard" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const role = await getAccountRole();
  if (!role)
    redirect("/auth?redirect=" + encodeURIComponent("/my-events/manage/" + id));
  const account = await readAccount(role);
  const registration = account.registrations.find(
    (r) => (r.id || r.slug) === id,
  );
  if (!registration) notFound();
  if (registration.slug !== "code-for-communities-chandigarh")
    return (
      <main className="account-programs-page">
        <h1>{registration.name}</h1>
        <p>Your registration is complete.</p>
        <a href="/my-events">Back to My Programs</a>
      </main>
    );
  return <ProgramDashboard registrationId={id} />;
}
