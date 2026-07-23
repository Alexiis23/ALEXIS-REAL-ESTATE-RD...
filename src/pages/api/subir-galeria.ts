import type { APIRoute } from 'astro';
import { put } from '@vercel/blob';
import fs from 'node:fs/promises';
import path from 'node:path';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.formData();
    const propertySlug = data.get('propertySlug')?.toString();
    const files = data.getAll('fotos');
    const adminPassword = data.get('adminPassword')?.toString();

    // 1. Verificación de Contraseña de Seguridad
    const correctPassword = import.meta.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'alexis-admin-2026';
    if (!adminPassword || adminPassword !== correctPassword) {
      return new Response(
        JSON.stringify({ error: 'Contraseña de acceso de administrador inválida.' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Validaciones iniciales de datos
    if (!propertySlug) {
      return new Response(
        JSON.stringify({ error: 'Debe seleccionar una propiedad.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!files || files.length === 0 || (files.length === 1 && (files[0] as File).size === 0)) {
      return new Response(
        JSON.stringify({ error: 'Debe seleccionar al menos una foto.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Verificar si el token de Vercel Blob está configurado
    const blobToken = import.meta.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return new Response(
        JSON.stringify({
          error: 'La variable de entorno BLOB_READ_WRITE_TOKEN no está configurada.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Subir archivos a Vercel Blob
    const uploadedUrls: string[] = [];
    for (const file of files) {
      if (file instanceof File && file.size > 0) {
        // Generar un nombre limpio y único para evitar colisiones en Vercel Blob
        const ext = path.extname(file.name);
        const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9]/g, '-');
        const uniqueName = `propiedades/${propertySlug}/${baseName}-${Date.now()}${ext}`;

        // Subir a Vercel Blob con acceso público
        const blob = await put(uniqueName, file, {
          access: 'public',
          token: blobToken,
        });

        uploadedUrls.push(blob.url);
      }
    }

    if (uploadedUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No se subió ningún archivo válido.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Actualizar el archivo JSON de la propiedad correspondiente
    const propiedadesDir = path.join(process.cwd(), 'src', 'content', 'propiedades');

    // Leer todos los archivos de la carpeta para encontrar el slug correcto
    const filesInDir = await fs.readdir(propiedadesDir);
    const targetFile = filesInDir.find(
      (file) => file.toLowerCase().replace(/\.json$/, '') === propertySlug.toLowerCase()
    );

    if (!targetFile) {
      return new Response(
        JSON.stringify({
          error: `No se encontró el archivo JSON para la propiedad: ${propertySlug}. Archivos disponibles: ${filesInDir.join(', ')}`,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const jsonPath = path.join(propiedadesDir, targetFile);

    // Verificar si el archivo JSON existe
    try {
      await fs.access(jsonPath);
    } catch {
      return new Response(
        JSON.stringify({
          error: `No se encontró el archivo JSON para la propiedad: ${propertySlug}`,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Leer el archivo actual
    const rawData = await fs.readFile(jsonPath, 'utf-8');
    const propertyData = JSON.parse(rawData);

    // Inicializar galeria si no existe o no es un arreglo
    if (!Array.isArray(propertyData.galeria)) {
      propertyData.galeria = [];
    }

    // Agregar las nuevas URLs de Vercel Blob
    propertyData.galeria.push(...uploadedUrls);

    // Guardar los cambios en el archivo JSON
    await fs.writeFile(jsonPath, JSON.stringify(propertyData, null, 2), 'utf-8');

    return new Response(
      JSON.stringify({ success: true, urls: uploadedUrls }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error en el endpoint subir-galeria:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Fallo interno en el servidor.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
