import { MetadataRoute } from 'next';

const BASE_URL = 'https://careyour.pet';

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = ['en', 'ru'];

  // Static routes
  const staticRoutes = [
    '',
    '/login',
    '/register',
    '/for-clinics',
    '/find-vet',
    '/privacy',
    '/terms',
    '/become-vet',
    '/share',
    '/verify',
    '/onboarding',
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const route of staticRoutes) {
    for (const locale of locales) {
      entries.push({
        url: `${BASE_URL}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' ? 'weekly' : 'monthly',
        priority: route === '' ? 1.0 : 0.5,
        alternates: {
          languages: {
            en: `${BASE_URL}/en${route}`,
            ru: `${BASE_URL}/ru${route}`,
          },
        },
      });
    }
  }

  return entries;
}