import type { APIRoute } from 'astro';
import { put } from '@vercel/blob';

export const prerender = false;

// Configuración de GitHub desde variables de entorno
const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
const GITHUB_OWNER = import.meta.env.GITHUB_OWNER || process.env.GITHUB_OWNER || 'Alexiis23';
const GITHUB_REPO = import.meta.env.GITHUB_REPO || process.env.GITHUB_REPO || 'ALEXIS-REAL-ESTATE-RD';
const GITHUB_BRANCH = 'main';

// Función para normalizar cadenas (ignora mayúsculas, tildes, espacios y guiones)
const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

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
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Validaciones iniciales
    if (!propertySlug || !files || files.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Debe seleccionar una propiedad y al menos una foto.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const blobToken =
      import.meta.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;

    if (!blobToken) {
      return new Response(
        JSON.stringify({ error: 'La variable de entorno BLOB_READ_WRITE_TOKEN no está configurada.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!GITHUB_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'La variable de entorno GITHUB_TOKEN no está configurada en Vercel.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Subir archivos a Vercel Blob
    const uploadedUrls: string[] = [];
    for (const file of files) {
      if (file instanceof File && file.size > 0) {
        const ext = file.name.substring(file.name.lastIndexOf('.'));
        const baseName = file.name.replace(ext, '').replace(/[^a-zA-Z0-9]/g, '-');
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
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Buscar el archivo JSON en GitHub usando la API de GitHub
    const folderUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/src/content/propiedades?ref=${GITHUB_BRANCH}`;
    const folderRes = await fetch(folderUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Astro-PropTech-App',
      },
    });

    if (!folderRes.ok) {
      throw new Error(`No se pudo consultar la carpeta de propiedades en GitHub (HTTP ${folderRes.status}).`);
    }

    const folderItems: Array<{ name: string; path: string; sha: string }> = await folderRes.json();

    // Encontrar el archivo coincidente ignorando espacios, guiones y tildes
    const targetFile = folderItems.find(
      (item) => normalizar(item.name.replace(/\.json$/, '')) === normalizar(propertySlug)
    );

    if (!targetFile) {
      return new Response(
        JSON.stringify({
          error: `No se encontró el archivo JSON en GitHub para la propiedad: ${propertySlug}`,
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Obtener el contenido actual del archivo JSON desde GitHub
    const fileUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${targetFile.path}?ref=${GITHUB_BRANCH}`;
    const fileRes = await fetch(fileUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Astro-PropTech-App',
      },
    });

    const fileData = await fileRes.json();
    const currentSha = fileData.sha;

    // Decodificar el contenido de Base64
    const contentDecoded = Buffer.from(fileData.content, 'base64').toString('utf-8');
    const propertyJson = JSON.parse(contentDecoded);

    // Inicializar galeria si no existe y añadir las nuevas fotos
    if (!Array.isArray(propertyJson.galeria)) {
      propertyJson.galeria = [];
    }
    propertyJson.galeria.push(...uploadedUrls);

    // 6. Hacer COMMIT directo en la rama main vía GitHub API
    const updatedContentBase64 = Buffer.from(
      JSON.stringify(propertyJson, null, 2),
      'utf-8'
    ).toString('base64');

    const updateRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${targetFile.path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Astro-PropTech-App',
        },
        body: JSON.stringify({
          message: `feat(admin): agregar ${uploadedUrls.length} fotos a la galeria de ${propertySlug}`,
          content: updatedContentBase64,
          sha: currentSha,
          branch: GITHUB_BRANCH,
        }),
      }
    );

    if (!updateRes.ok) {
      const errData = await updateRes.json();
      throw new Error(`Error al hacer commit en GitHub: ${errData.message}`);
    }

    // 7. Respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        urls: uploadedUrls,
        message: `¡Fotos subidas a Vercel Blob y commit realizado en GitHub con éxito!`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error en el endpoint subir-galeria:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Fallo interno en el servidor.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};