import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: [
    '172.20.10.6',
    '172.20.10.6:3000',
    '192.168.58.91',
    '192.168.58.91:3000',
    'localhost',
    'localhost:3000',
    '127.0.0.1',
    '127.0.0.1:3000',
  ],
};

export default nextConfig;
