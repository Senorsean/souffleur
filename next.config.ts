import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // mammoth reads DOCX files on the server only.
  serverExternalPackages: ["mammoth"],
  // Pin the workspace root to this folder (avoids picking up a lockfile higher up).
  turbopack: { root: process.cwd() },
};

export default nextConfig;
