import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A redirect and an external rewrite, so the log drain's "redirect" and
  // "external" sources have something to report.
  async redirects() {
    return [{ source: "/clinic", destination: "/vets", permanent: false }];
  },
  async rewrites() {
    return [
      {
        source: "/petclinic-openapi.yml",
        destination:
          "https://raw.githubusercontent.com/spring-petclinic/spring-petclinic-rest/master/src/main/resources/openapi.yml",
      },
    ];
  },
};

export default nextConfig;
