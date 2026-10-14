import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: lets the site be opened on 127.0.0.1 as well as localhost
  // (handy for testing a brand and a creator side by side with separate logins).
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
