import type { NextConfig } from "next";
const config: NextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  poweredByHeader: false,
  devIndicators: false,
  async redirects() {
    return [
      {
        source: "/hackathon/:slug",
        destination: "/hackathons/:slug",
        permanent: true,
      },
      { source: "/clients", destination: "/our-clientele", permanent: true },
      { source: "/host-event", destination: "/host", permanent: true },
      {
        source: "/my-programs",
        destination: "/my-events",
        permanent: false,
      },
    ];
  },
};
export default config;
