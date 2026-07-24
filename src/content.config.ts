import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const propiedades = defineCollection({
  loader: glob({ pattern: '**/[^_]*.json', base: "./src/content/propiedades" }),
  schema: z.object({
    titulo: z.string().optional().or(z.literal('')),
    descripcion: z.string().optional(),
    titulo_en: z.string().optional(),
    descripcion_en: z.string().optional(),
    precio: z.union([z.number(), z.string()]).optional(), // legacy — fallback para precioUsd
    precioUsd: z.union([z.number(), z.string()]).optional(),
    precioDop: z.union([z.number(), z.string()]).optional(),
    regimen: z.string().optional(),
    exclusiva: z.boolean().optional(),
    confotur: z.boolean().optional(),
    tipo: z.string().optional(),
    estado: z.string().optional(),
    habitaciones: z.union([z.number(), z.string()]).optional(),
    banos: z.union([z.number(), z.string()]).optional(),
    parqueos: z.union([z.number(), z.string()]).optional(),
    area: z.union([z.number(), z.string()]).optional(),
    ubicacion: z.string().optional(),
    latitud: z.union([z.number(), z.string()]).optional(),
    longitud: z.union([z.number(), z.string()]).optional(),
    imagenPrincipal: z.string().optional(),

    // 🚀 FLEXIBILIZACIÓN CLAVE: Acepta cualquier estructura en la galería sin romper la compilación
    galeria: z.array(z.any()).optional(),
  }).passthrough() // 👈 PERMITE CAMPOS EXTRAS QUE ENVÍE KEYSTATIC SIN BLOQUEAR EL BUILD
});

export const collections = { propiedades };