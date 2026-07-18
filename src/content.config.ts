import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const propiedades = defineCollection({
  loader: glob({ pattern: '**/*.json', base: "./src/content/propiedades" }),
  schema: z.object({
    // 🌟 Al usar .optional() en TODO, Astro no volverá a tirar un "Required" jamás
    titulo: z.string().optional(), 
    descripcion: z.string().optional(),
    
    // 👑 NUEVOS CAMPOS ESPEJO PARA EL TRADUCTOR INVISIBLE (Totalmente opcionales y seguros)
    titulo_en: z.string().optional(),
    descripcion_en: z.string().optional(),

    precio: z.any().optional(), 
    ubicacion: z.string().optional(),
    tipo: z.string().optional(),
    estado: z.string().optional(),
    confotur: z.boolean().optional(),
    habitaciones: z.any().optional(),
    banos: z.any().optional(),
    parqueos: z.any().optional(),
    area: z.any().optional(),
    latitud: z.any().optional(),
    longitud: z.any().optional(),
    imagenPrincipal: z.string().optional(),
  })
});

export const collections = { propiedades };