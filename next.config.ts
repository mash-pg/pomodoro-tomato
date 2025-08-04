import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: require.resolve('buffer/'),
      };
    }
    return config;
  },
};

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // 開発環境ではPWAを無効にする
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
