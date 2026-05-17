import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Legacy /login and /signup were removed in favour of the French routes
  // /connexion and /inscription. Permanent redirects keep bookmarks alive.
  async redirects() {
    return [
      { source: "/login", destination: "/connexion", permanent: true },
      { source: "/signup", destination: "/inscription", permanent: true },
    ];
  },
};

export default nextConfig;
