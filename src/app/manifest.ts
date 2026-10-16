import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KUNurse+Lab | ระบบบริหารจัดการห้องปฏิบัติการพยาบาล',
    short_name: 'KUNurse+Lab',
    description: 'KUNurse+Lab - ระบบบริหารจัดการห้องปฏิบัติการพยาบาลและคลังพัสดุ คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0d9488',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'th',
    ...( {
      launch_handler: {
        client_mode: 'auto',
      },
      handle_links: 'preferred',
    } as any ),
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192x192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
