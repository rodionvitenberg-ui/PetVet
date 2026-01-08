import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin(); // <-- Скобки пустые

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Твои настройки...
};

export default withNextIntl(nextConfig);