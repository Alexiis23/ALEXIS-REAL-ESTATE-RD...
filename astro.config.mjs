import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import keystatic from '@keystatic/astro';
import vercel from '@astrojs/vercel'; // 🌟 Importación del adaptador

export default defineConfig({
  output: 'server', // 🌟 Cambiado a 'server' para permitir que tu API de Resend procese correos en vivo
  integrations: [react(), keystatic()],
  adapter: vercel(), // 🌟 Conector oficial de la nube
  vite: {
    plugins: [tailwindcss()]
  }
});