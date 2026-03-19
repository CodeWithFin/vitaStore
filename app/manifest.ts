import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VitaStore Inventory',
    short_name: 'VitaStore',
    description: 'Inventory Management System',
    start_url: '/',
    display: 'standalone',
    background_color: '#FDFCF8',
    theme_color: '#1C1917',
    icons: [
      {
        src: '/icon.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
