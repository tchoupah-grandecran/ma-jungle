import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Ma Jungle',
        short_name: 'Jungle',
        description: 'Suivi d arrosage pour nos plantes',
        theme_color: '#F9F6F0',
        background_color: '#F9F6F0',
        display: 'standalone',
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/628/628283.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      devOptions: {
    enabled: true 
  }
    })
  ],
})