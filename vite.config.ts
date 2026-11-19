import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [react(), VitePWA({
        registerType: 'prompt',
        manifest: {
            name: 'UT STAR Catastro ALC', short_name: 'UT★STAR',
            description: 'Aplicación de Catastro de Alcantarillado para UT STAR',
            theme_color: '#0D1117', background_color: '#0D1117',
            display: 'standalone', orientation: 'portrait',
            icons: [
                { src: 'logo-ut-star.png', sizes: '192x192', type: 'image/png' },
                { src: 'logo-ut-star.png', sizes: '512x512', type: 'image/png' },
            ],
        },
        // Los mapas satelitales JSON pesan decenas de MB y se descargan bajo demanda.
        workbox: { globPatterns: ['**/*.{js,css,html,png,svg,woff2,webmanifest}'] },
    })],
});
