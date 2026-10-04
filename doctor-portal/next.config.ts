import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The doctor dashboard deployment opens straight to the clinician login.
  async redirects() {
    return [{ source: "/", destination: "/doctor", permanent: false }];
  },
};

export default nextConfig;
