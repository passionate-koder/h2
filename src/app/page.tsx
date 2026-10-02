import { getPage, SitePage } from "@/lib/content";
export default async function Home() {
  const page = await getPage("/");
  return page ? <SitePage page={page} /> : null;
}
