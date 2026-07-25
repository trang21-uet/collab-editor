import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the Docker image ship just .next/standalone + .next/static + public
  // instead of the full node_modules/source tree.
  output: "standalone",
};

export default nextConfig;
