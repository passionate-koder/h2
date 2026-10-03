import { redirect } from "next/navigation";
import { getIdentity, readAccount } from "@/lib/accounts";
import { ProfilePage } from "@/components/profile-page";
export const metadata = { title: "Profile" };
export default async function Page() {
  const role = await getIdentity();
  if (!role) redirect("/auth?redirect=/profile");
  return <ProfilePage initialProfile={(await readAccount(role)).profile} />;
}
