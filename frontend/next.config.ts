import type { NextConfig } from "next";

// React's development tooling uses eval for source-mapped stack traces.
// Keep production strict; this relaxation exists only on a local dev server.
const developmentEval = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';

const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${developmentEval}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://storage.googleapis.com https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://transparent-city.vercel.app",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org",
  "frame-src 'none'",
  "upgrade-insecure-requests",
].join('; ');

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspDirectives },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/traffy_public_bucket/**",
      },
      {
        protocol: "https",
        hostname: "transparent-city.vercel.app",
        pathname: "/api/og/**",
      },
    ],
  },
};

export default nextConfig;
