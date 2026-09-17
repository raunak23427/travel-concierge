/** @type {import('next').NextConfig} */
const nextConfig = {
    distDir: process.env.NEXT_DIST_DIR || ".next",
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'unsplash.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                pathname: '/**',
            },
            {
                protocol: 'http',
                hostname: 'api.tbotechnology.in',
                pathname: '/**',
            },
        ],
    },
};

export default nextConfig;
