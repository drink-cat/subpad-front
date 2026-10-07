import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 开发服务器默认只放行 localhost。**.* 匹配所有带点的域名，例如 foods.launch.o1.local。
  allowedDevOrigins: ["**.*"],
  async rewrites() {
    return [{ source: "/backend/:path*", destination: "http://127.0.0.1:8080/:path*" }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["pino-pretty", "lokijs", "encoding"],
  turbopack: {
    resolveAlias: {
      "pino-pretty": "./lib/empty.ts",
      lokijs: "./lib/empty.ts",
      encoding: "./lib/empty.ts",
    },
  },
};

export default nextConfig;
