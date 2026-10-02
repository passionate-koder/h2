import Link from "next/link";
import { CalendarDays, BriefcaseBusiness } from "lucide-react";
import { redirect } from "next/navigation";
import { getAccountRole, readAccount } from "@/lib/accounts";
import { AccountFooter } from "@/components/account-footer";
import { Button } from "@/components/ui/button";
import { MyPrograms } from "@/components/my-programs";
export const metadata = { title: "My Programs" };
export default async function Page() {
  const role = await getAccountRole();
  if (!role) redirect("/auth?redirect=/my-events");
  const { registrations } = await readAccount(role);
  return (
    <>
      <main id="page-content" className="account-programs-page">
        <header className="account-programs-hero">
          <h1>My Programs</h1>
          <p>
            Create your team, submit your project, and follow your registrations
            timeline easily from this dashboard.
          </p>
        </header>
        {registrations.length ? (
          <MyPrograms registrations={registrations} />
        ) : (
          <div className="account-no-events">
            <BriefcaseBusiness size={52} />
            <h2>No Events Found</h2>
            <p>
              You haven&apos;t registered for any events yet. Start exploring!
            </p>
            <Button asChild>
              <Link href="/programs">Browse Events</Link>
            </Button>
          </div>
        )}
      </main>
      <AccountFooter />
    </>
  );
}
