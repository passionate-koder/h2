import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import parse, {
  Element,
  domToReact,
  attributesToProps,
  type DOMNode,
  type HTMLReactParserOptions,
} from "html-react-parser";
import Link from "next/link";
import routes from "@/content/routes.json";
import footer from "@/content/footer.json";
import { HostForm } from "@/components/host-form";
import { ProgramDirectory } from "@/components/program-directory";
import { InteractiveSurface } from "@/components/interactive-surface";
import { TestimonialCarousel } from "@/components/testimonial-carousel";
import { ProgramControl } from "@/components/program-controls";
import { FeaturedCarousel } from "@/components/featured-carousel";
import {MyProgramsLink} from '@/components/my-programs-link';
export const getPage = cache(async (route: string) => {
  const entry = routes.find((p) => p.route === route);
  if (!entry) return null;
  return JSON.parse(
    await fs.readFile(
      path.join(process.cwd(), "src/content/pages", entry.file + ".json"),
      "utf8",
    ),
  ) as { route: string; title: string; html: string; footer: string };
});
function text(node: DOMNode): string {
  return node.type === "text"
    ? node.data
    : node instanceof Element
      ? node.children.map((n) => text(n as DOMNode)).join("")
      : "";
}
export function Content({
  html,
  category,
  footerHtml = footer.html,
}: {
  html: string;
  category?: string;
  footerHtml?: string;
}) {
  const options: HTMLReactParserOptions = {
    replace(node) {
      if (!(node instanceof Element)) return;
      if (node.attribs["data-slot"] === "program-directory")
        return <ProgramDirectory className={node.attribs.class} />;
      if (node.attribs["data-slot"] === "site-footer")
        return <>{parse(footerHtml, options)}</>;
      if (
        node.name === "div" &&
        node.children.some(
          (n) =>
            n instanceof Element && n.attribs["aria-label"] === "Next slide",
        )
      ) {
        const viewport = node.children.find(
          (n) =>
            n instanceof Element &&
            n.attribs.class?.includes("overflow-hidden"),
        );
        if (viewport instanceof Element) {
          const track = viewport.children.find(
            (n) => n instanceof Element && n.attribs.class?.includes("flex"),
          );
          if (track instanceof Element)
            return (
              <FeaturedCarousel
                className={node.attribs.class}
                slides={track.children
                  .filter((n) => n instanceof Element)
                  .map((n) => domToReact([n as DOMNode], options))}
              />
            );
        }
      }
      if (
        node.name === "div" &&
        node.children.some(
          (n) =>
            n instanceof Element &&
            n.attribs["aria-label"] === "Next testimonial",
        )
      ) {
        const parent = node.parent;
        if (parent instanceof Element) {
          const desktop = parent.children.find(
            (n) =>
              n instanceof Element &&
              n.attribs.class?.includes("md:grid-cols-3"),
          );
          if (desktop instanceof Element) {
            return (
              <TestimonialCarousel
                className={node.attribs.class}
                slides={desktop.children
                  .filter((n) => n instanceof Element)
                  .map((n) => domToReact([n as DOMNode], options))}
              />
            );
          }
        }
      }
      if (
        node.name === "button" &&
        node.attribs.class?.includes("w-32 sm:w-36") &&
        text(node) === "All Programs"
      )
        return (
          <ProgramControl kind="category" className={node.attribs.class} />
        );
      if (
        node.name === "button" &&
        node.children.some(
          (n) =>
            n instanceof Element &&
            n.attribs.class?.includes("lucide-arrow-up-narrow-wide"),
        )
      )
        return <ProgramControl kind="sort" className={node.attribs.class} />;
      if (
        node.name === "button" &&
        node.children.some(
          (n) =>
            n instanceof Element && n.attribs.class?.includes("lucide-funnel"),
        )
      )
        return <ProgramControl kind="filter" className={node.attribs.class} />;
      if (
        node.name === "form" &&
        node.parent instanceof Element &&
        node.parent.attribs.id === "host-form"
      )
        return <HostForm />;
      if (node.name === "a") {
        if(text(node).trim()==='My Programs')return <MyProgramsLink className={node.attribs.class}>{domToReact(node.children as DOMNode[],options)}</MyProgramsLink>;
        const href = node.attribs.href;
        if (
          category &&
          (href === "/blog" || href?.startsWith("/blog?category="))
        ) {
          const active = href === `/blog?category=${category}`;
          return (
            <Link
              href={href}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${active ? "bg-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              {domToReact(node.children as DOMNode[], options)}
            </Link>
          );
        }
        if (
          category &&
          node.children.some((n) => n instanceof Element && n.name === "div") &&
          /min read/.test(text(node))
        ) {
          const content = text(node).toLowerCase();
          if (
            (category === "featured" && !content.includes("featured")) ||
            (category === "business" && !content.includes("business")) ||
            (category === "hackathons" &&
              !content.includes("hackathonoct") &&
              !content.includes("hackathons"))
          ) {
            return <></>;
          }
        }
        if (href?.startsWith("/")) {
          const props = attributesToProps(node.attribs);
          return (
            <Link {...props} href={href}>
              {domToReact(node.children as DOMNode[], options)}
            </Link>
          );
        }
      }
    },
  };
  return <>{parse(html, options)}</>;
}
export function Footer({ html = footer.html }: { html?: string }) {
  return (
    <InteractiveSurface>
      <Content html={html} />
    </InteractiveSurface>
  );
}
export function SitePage({
  page,
  category,
}: {
  page: NonNullable<Awaited<ReturnType<typeof getPage>>>;
  category?: string;
}) {
  return (
    <InteractiveSurface>
      <Content
        html={page.html}
        category={category}
        footerHtml={page.footer || footer.html}
      />
    </InteractiveSurface>
  );
}
