import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
};

const pwaConfig = withPWA({
  dest: "public",
  register: false, // Temporarily disable PWA registration
  skipWaiting: true,
  disable: true, // Temporarily disable PWA in all environments
  buildExcludes: [
    /app-build-manifest\.json$/,
    /app-path-routes-manifest\.json$/,
    /app-route-manifest\.json$/,
    /build-manifest\.json$/,
    /dynamic-css-manifest\.json$/,
    /react-loadable-manifest\.json$/,
    /routes-manifest\.json$/,
    /server-build-manifest\.json$/,
    /static-build-manifest\.json$/,
    /_middleware\.js$/,
    /_middleware\.js\.map$/,
    /_middleware\.ts$/,
    /_middleware\.ts\.map$/,
  ],
});

export default pwaConfig(nextConfig);
