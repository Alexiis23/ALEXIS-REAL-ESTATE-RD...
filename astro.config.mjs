import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite'; // 🌟 CORREGIDO: Tu importación real y limpia
import keystatic from '@keystatic/astro';

export default defineConfig({
  // Comportamiento estándar para Astro v5+
  output: 'static',

  integrations: [
    react(),
    keystatic()
  ],
  vite: {
    plugins: [
      tailwindcss()
    ]
  }
});