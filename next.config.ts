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
        ],
      },
    ];
  },
};

export default nextConfig;

/**
 * Nota: la `Content-Security-Policy` **no** se pone aquí. Necesita un nonce por
 * petición (para poder prescindir de `'unsafe-inline'` en `script-src`) y eso
 * solo puede generarse en tiempo de ejecución: ver `src/proxy.ts` y `src/lib/csp.ts`.
 */
