import Link from "next/link";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/accounts";
import { listMyApplications } from "@/lib/marketplace/repository";
export const metadata = { title: "My Applications" };
export default async function ApplicationsPage() { const identity = await getIdentity(); if (!identity) redirect("/auth?redirect=/applications"); const applications = await listMyApplications(identity); return <main id="page-content" className="market-page market-narrow"><h1>My applications</h1><p>Drafts, submitted applications, and status updates in one place.</p>{applications.length ? <div className="application-list">{applications.map(application => <Link key={application.id} href={`/applications/${application.id}`}><div><strong>{application.opportunityTitle}</strong><span>{application.reference}</span></div><span className="market-badge">{application.status}</span></Link>)}</div> : <div className="market-empty"><h2>No applications yet</h2><Link href="/opportunities?type=job,internship">Browse jobs and internships</Link></div>}</main>; }
