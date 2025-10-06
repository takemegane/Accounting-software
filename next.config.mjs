import withPWA from "next-pwa";
import runtimeCaching from "next-pwa/cache.js";

const isDev = process.env.NODE_ENV === "development";

const nextConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: isDev,
  runtimeCaching,
})(
  {
    experimental: {
      typedRoutes: true,
    },
  }
);

export default nextConfig;
