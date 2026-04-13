/** @type {import('next').NextConfig} */
const nextConfig = {
  // 환경변수 누락 시 빌드 시점에 명시적 에러 발생
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  // xlsx 패키지가 클라이언트 번들에서 Node.js built-ins를 참조하는 경우 무시
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs:     false,
        crypto: false,
        stream: false,
        path:   false,
        buffer: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
