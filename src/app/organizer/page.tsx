import { getIdentity } from "@/lib/accounts";
import { myOrganizations } from "@/lib/events/organizations";
import { myCompetitions } from "@/lib/events/competitions";
import { OrganizerWorkspace } from "@/components/organizer-workspace";
import Link from "next/link";
export const dynamic="force-dynamic";
export default async function OrganizerPage(){const user=await getIdentity();if(!user)return <main id="page-content" className="mx-auto max-w-4xl p-8"><h1>Organizer workspace</h1><Link href="/auth">Sign in to continue</Link></main>;const [organizations,competitions]=await Promise.all([myOrganizations(user),myCompetitions(user)]);return <main id="page-content" className="mx-auto max-w-4xl p-8"><h1 className="text-3xl font-bold">Organizer workspace</h1><OrganizerWorkspace organizations={organizations} competitions={competitions}/></main>}
