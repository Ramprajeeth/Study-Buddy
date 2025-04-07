let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // ✅ REQUIRED for `next export`
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
}

mergeConfig(nextConfig, userConfig)

function mergeConfig(base, override) {
  if (!override) return

  for (const key in override) {
    if (
      typeof base[key] === 'object' &&
      !Array.isArray(base[key]) &&
      typeof override[key] === 'object'
    ) {
      base[key] = {
        ...base[key],
        ...override[key],
      }
    } else {
      base[key] = override[key]
    }
  }
}

export default nextConfig
