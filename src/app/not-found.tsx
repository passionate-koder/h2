import Link from "next/link";
import { Footer } from "@/lib/content";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <>
      <main id="page-content" className="hc-auth-grid">
        <div className="hc-auth-card text-center">
          <div className="text-primary text-6xl font-bold mb-4">404</div>
          <h1>Page Not Found</h1>
          <p className="text-gray-500 my-5">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
          <Button asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </>
  );
}
