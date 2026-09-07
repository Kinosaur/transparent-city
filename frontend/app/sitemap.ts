import type { MetadataRoute } from 'next'

const baseUrl = 'https://transparent-city.vercel.app'
const routes = ['', '/districts', '/leaderboard', '/gallery', '/map', '/methods']

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.flatMap((route) => {
    const url = `${baseUrl}/en${route}`
    const thUrl = `${baseUrl}/th${route}`
    const priority = route === '' ? 1 : route === '/methods' ? 0.7 : 0.8
    return [
      {
        url,
        changeFrequency: route === '' ? 'weekly' : 'monthly',
        priority,
        alternates: { languages: { en: url, th: thUrl } },
      },
      {
        url: thUrl,
        changeFrequency: route === '' ? 'weekly' : 'monthly',
        priority,
        alternates: { languages: { en: url, th: thUrl } },
      },
    ]
  })
}
