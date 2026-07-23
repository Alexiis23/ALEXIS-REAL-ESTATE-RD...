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
    const correctPassword =
      import.meta.env.ADMIN_PASSWORD ||
      process.env.ADMIN_PASSWORD ||
      'alexis-admin-2026';

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
    const blobToken =
      import.meta.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;

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
        const ext = path.extname(file.name);
        const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9]/g, '-');
        const uniqueName = `propiedades/${propertySlug}/${baseName}-${Date.now()}${ext}`;

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

    // 4. Búsqueda y actualización segura del archivo JSON
    const propiedadesDir = path.join(process.cwd(), 'src', 'content', 'propiedades');

    // Función para ignorar mayúsculas, tildes, espacios y caracteres especiales
    const normalizar = (texto: string) =>
      texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

    let targetFile: string | undefined;
    try {
      const filesInDir = await fs.readdir(propiedadesDir);
      targetFile = filesInDir.find(
        (file) => normalizar(file.replace(/\.json$/, '')) === normalizar(propertySlug)
      );
    } catch (dirError) {
      console.warn('No se pudo acceder a la carpeta de propiedades local:', dirError);
    }

    // Si existe el archivo, intentamos actualizarlo localmente
    if (targetFile) {
      const jsonPath = path.join(propiedadesDir, targetFile);
      try {
        const rawData = await fs.readFile(jsonPath, 'utf-8');
        const propertyData = JSON.parse(rawData);

        if (!Array.isArray(propertyData.galeria)) {
          propertyData.galeria = [];
        }

        propertyData.galeria.push(...uploadedUrls);
        await fs.writeFile(jsonPath, JSON.stringify(propertyData, null, 2), 'utf-8');
      } catch (fsError: any) {
        // En Vercel el sistema de archivos es Read-Only (EROFS).
        // Ignoramos el error para no cancelar la respuesta exitosa con las URLs de Blob.
        console.warn('Escritura en disco omitida (sistema de solo lectura en servidor):', fsError.message);
      }
    }

    // 5. Respuesta exitosa garantizada
    return new Response(
      JSON.stringify({
        success: true,
        urls: uploadedUrls,
        message: '¡Fotos subidas a Vercel Blob con éxito!',
      }),
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