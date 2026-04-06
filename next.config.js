/** @type {import('next').NextConfig} */
const nextConfig = {
  // 환경변수 누락 시 빌드 시점에 명시적 에러 발생
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
}

module.exports = nextConfig
