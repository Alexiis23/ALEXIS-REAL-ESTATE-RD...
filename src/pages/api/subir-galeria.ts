import type { APIRoute } from 'astro';
import { put } from '@vercel/blob';

export const prerender = false;

// Variables de entorno para GitHub API
const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
const GITHUB_OWNER = import.meta.env.GITHUB_OWNER || process.env.GITHUB_OWNER || 'Alexiis23';
const GITHUB_REPO = import.meta.env.GITHUB_REPO || process.env.GITHUB_REPO || 'ALEXIS-REAL-ESTATE-RD';
const GITHUB_BRANCH = 'main';

// Función ayudante para normalizar nombres (elimina tildes, guiones, espacios y tildes)
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

    // 1. Verificación de Contraseña Administrativa
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
        JSON.stringify({
          error: 'Falta la variable GITHUB_TOKEN en Vercel. Asegúrese de agregarla y hacer Redeploy.',
        }),
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

    // 4. Consultar la carpeta de propiedades en el repositorio privado
    const folderUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/src/content/propiedades?ref=${GITHUB_BRANCH}`;

    const folderRes = await fetch(folderUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Astro-PropTech-App',
      },
    });

    if (!folderRes.ok) {
      const errText = await folderRes.text();
      throw new Error(
        `Error al consultar repositorio privado (${folderRes.status}): ${errText}. Revisa que GITHUB_TOKEN tenga acceso 'repo'.`
      );
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

    // 5. Obtener el archivo JSON actual desde GitHub
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
    const contentDecoded = Buffer.from(fileData.content, 'base64').toString('utf-8');
    const propertyJson = JSON.parse(contentDecoded);

    // Añadir las nuevas fotos de Vercel Blob
    if (!Array.isArray(propertyJson.galeria)) {
      propertyJson.galeria = [];
    }
    propertyJson.galeria.push(...uploadedUrls);

    // 6. Hacer COMMIT automático en GitHub mediante la API REST
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
          message: `feat(galeria): agregar ${uploadedUrls.length} fotos a ${propertySlug}`,
          content: updatedContentBase64,
          sha: currentSha,
          branch: GITHUB_BRANCH,
        }),
      }
    );

    if (!updateRes.ok) {
      const errData = await updateRes.json();
      throw new Error(`Error en el commit de GitHub: ${errData.message}`);
    }

    // 7. Respuesta de éxito
    return new Response(
      JSON.stringify({
        success: true,
        urls: uploadedUrls,
        message: '¡Fotos subidas a Vercel Blob y sincronizadas en GitHub con éxito!',
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