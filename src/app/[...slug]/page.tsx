import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPage, SitePage, Footer } from "@/lib/content";
import { AuthForm } from "@/components/auth-form";
import routes from "@/content/routes.json";
type Props = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
};
export function generateStaticParams() {
  return routes
    .filter((r) => r.route !== "/")
    .map((r) => ({ slug: r.route.slice(1).split("/") }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage("/" + slug.join("/"));
  return { title: page?.title ? { absolute: page.title } : "Page Not Found" };
}
export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const route = "/" + slug.join("/");
  if (route.startsWith("/hackathons/register/"))
    redirect("/auth?redirect=" + encodeURIComponent(route));
  if (route === "/profile/programs") redirect("/my-events");
  if (route === "/auth" || route === "/auth/reset-password")
    return (
      <>
        <AuthForm
          initialMode={
            route.includes("reset-password")
              ? "reset"
              : query.mode === "signup"
                ? "signup"
                : "signin"
          }
        />
        <Footer />
      </>
    );
  const page = await getPage(route);
  if (!page) notFound();
  return (
    <SitePage
      page={page}
      category={route === "/blog" ? query.category : undefined}
    />
  );
}
