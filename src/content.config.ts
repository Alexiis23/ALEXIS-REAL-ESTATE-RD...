import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders'; // Si estás usando la API de loaders de Astro v5/v7

const propiedades = defineCollection({
  // Si usas Astro v5/v7 usa loader, si usas v4 usa el método antiguo
  loader: glob({ pattern: '**/[^_]*.json', base: "./src/content/propiedades" }),
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string(),
    titulo_en: z.string().optional(),
    descripcion_en: z.string().optional(),
    precio: z.number(),

    // 🚀 LA CORRECCIÓN AQUÍ: Añadir el campo al validador de Astro
    regimen: z.enum(['Venta', 'Alquiler']).default('Venta'),

    exclusiva: z.boolean().default(false),
    confotur: z.boolean().default(false),
    tipo: z.string(),
    estado: z.string(),
    habitaciones: z.number().default(0),
    banos: z.number().default(0),
    parqueos: z.number().default(0),
    area: z.number().optional(),
    ubicacion: z.string().default('Dominican Republic'),
    imagenPrincipal: z.string().optional(),
    galeria: z.array(z.string()).optional(),
  })
});

export const collections = { propiedades };