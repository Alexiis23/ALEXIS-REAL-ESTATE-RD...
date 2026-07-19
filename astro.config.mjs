import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import keystatic from '@keystatic/astro';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server', // 🌟 OBLIGATORIO: Activa el motor SSR dinámico para las APIs en la nube
  adapter: vercel(),
  integrations: [
    react(),
    keystatic(), // Vincula automáticamente el panel administrativo a las rutas de Astro
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});