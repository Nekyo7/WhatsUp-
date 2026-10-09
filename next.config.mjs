/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.anthropic.com https://generativelanguage.googleapis.com https://api.openai.com http://localhost:* http://127.0.0.1:*",
              "frame-ancestors 'none'",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
