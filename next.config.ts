import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["*.e2b.app"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          ...(process.env.NODE_ENV === "development"
            ? []
            : [
                { key: "X-Frame-Options", value: "DENY" },
                // HSTS: fuerza HTTPS 2 años. Solo en producción para no fijarlo
                // sobre localhost durante el desarrollo.
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]),
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              // `connect-src` también gobierna los WebSocket: sin el origen wss
              // de Finnhub, la CSP bloqueaba los precios en vivo
              // (`new WebSocket("wss://ws.finnhub.io?token=…")` en
              // `src/lib/market-data/realtime.ts`) y el badge se quedaba en
              // "sin conexión". `'self'` cubre el resto de fetch de la app.
              "connect-src 'self' wss://ws.finnhub.io",
              process.env.NODE_ENV === "development" ? "frame-ancestors 'self' https://*.arena.ai https://arena.ai https://*.e2b.app" : "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
