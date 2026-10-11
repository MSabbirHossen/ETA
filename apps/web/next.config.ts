import type { NextConfig } from "next";

// Fail-closed build-time assertion: NEXT_PUBLIC_ENABLE_E2E_AUTH is strictly forbidden in production builds
if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ENABLE_E2E_AUTH === 'true') {
  process.env.NEXT_PUBLIC_ENABLE_E2E_AUTH = 'false';
}

const nextConfig: NextConfig = {
  transpilePackages: ['@eta/types', '@eta/config', '@eta/utils', '@eta/validation'],
  env: {
    ...(process.env.NODE_ENV === 'production'
      ? { NEXT_PUBLIC_ENABLE_E2E_AUTH: 'false' }
      : {}),
  },
};

export default nextConfig;
