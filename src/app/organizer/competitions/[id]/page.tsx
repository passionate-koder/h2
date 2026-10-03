import { getIdentity } from "@/lib/accounts";
import { eventWorkspace } from "@/lib/events/competitions";
import { EventManager } from "@/components/event-manager";
import Link from "next/link";
export const dynamic="force-dynamic";
export default async function EventManagerPage({params}:{params:Promise<{id:string}>}){const user=await getIdentity();if(!user)return <main id="page-content" className="p-8"><Link href="/auth">Sign in</Link></main>;const {id}=await params;const workspace=await eventWorkspace(user,id);return <main id="page-content" className="mx-auto max-w-5xl p-8"><EventManager workspace={workspace} userId={user.id}/></main>}
