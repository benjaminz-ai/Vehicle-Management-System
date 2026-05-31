import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: [
    "firebase-admin",
    "firebase",
    "@firebase/app",
    "@firebase/auth",
    "@firebase/firestore",
    "@firebase/storage",
    "@firebase/functions",
    "@firebase/installations",
    "@firebase/component",
    "@firebase/util",
    "@firebase/logger",
    "@firebase/webchannel-wrapper",
  ],
};

export default nextConfig;
