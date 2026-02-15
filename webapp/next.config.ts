import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment.
  // This bundles the server + dependencies into .next/standalone
  // for a minimal production image (~100MB vs ~1GB).
  output: "standalone",
};

export default nextConfig;
