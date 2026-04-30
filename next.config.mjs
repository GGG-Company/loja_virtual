/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development';

const cspConnectSrc = [
  "'self'",
  'https://*.mercadopago.com',
  'https://*.mlstatic.com',
  'https://*.mercadolibre.com',
  'https://*.mercadolivre.com',
  'https://viacep.com.br',
  'https://loja.azura.dev.br',
].join(' ');

const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'http2.mlstatic.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  async headers() {
    return [
      // ── Static assets — cache agressivo no CDN (só produção) ──────────
      ...(!isDev ? [{
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      }] : []),
      // ── Imagens públicas (só produção) ─────────────────────────────────
      ...(!isDev ? [{
        source: '/(.*)\\.(jpg|jpeg|png|webp|avif|svg|ico|gif)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' },
        ],
      }] : []),
      // ── Páginas HTML — cache curto para não travar clientes após deploy ──
      ...(!isDev ? [{
        source: '/produtos(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, stale-while-revalidate=60' },
        ],
      },
      {
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=120, stale-while-revalidate=60' },
        ],
      }] : []),
      // ── Segurança global ───────────────────────────────────────────────
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ...(!isDev
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
            : []),
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://http2.mlstatic.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.s3.amazonaws.com https://*.mlstatic.com https://*.mercadolibre.com https://*.mercadolivre.com",
              `connect-src ${cspConnectSrc}`,
              "frame-src 'self' https://*.mercadopago.com https://*.mlstatic.com https://*.mercadolibre.com https://*.mercadolivre.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
