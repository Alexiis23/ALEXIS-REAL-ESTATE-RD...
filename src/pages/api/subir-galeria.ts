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

// ─── Helpers reutilizables ───────────────────────────────

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function verificarPassword(adminPassword: string | undefined) {
  const correctPassword =
    import.meta.env.ADMIN_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    'alexis-admin-2026';

  return adminPassword && adminPassword === correctPassword;
}

// ─── MODO "blob": sube UNA sola foto a Vercel Blob ──────

async function handleBlobUpload(data: FormData) {
  const propertySlug = data.get('propertySlug')?.toString();
  const file = data.get('foto') as File | null;

  if (!propertySlug || !file || file.size === 0) {
    return jsonResponse(
      { error: 'Debe enviar propertySlug y un archivo (foto).' },
      400
    );
  }

  const blobToken =
    import.meta.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;

  if (!blobToken) {
    return jsonResponse(
      { error: 'La variable de entorno BLOB_READ_WRITE_TOKEN no está configurada.' },
      500
    );
  }

  const ext = file.name.substring(file.name.lastIndexOf('.'));
  const baseName = file.name.replace(ext, '').replace(/[^a-zA-Z0-9]/g, '-');
  const uniqueName = `propiedades/${propertySlug}/${baseName}-${Date.now()}${ext}`;

  const blob = await put(uniqueName, file, {
    access: 'public',
    token: blobToken,
  });

  return jsonResponse({ success: true, url: blob.url });
}

// ─── MODO "commit": guarda las URLs en GitHub ────────────

async function handleCommit(data: FormData) {
  const propertySlug = data.get('propertySlug')?.toString();
  const urlsRaw = data.get('urls')?.toString();

  if (!propertySlug || !urlsRaw) {
    return jsonResponse(
      { error: 'Debe enviar propertySlug y las urls.' },
      400
    );
  }

  let urls: string[];
  try {
    urls = JSON.parse(urlsRaw);
  } catch {
    return jsonResponse({ error: 'El campo urls no es un JSON válido.' }, 400);
  }

  if (!Array.isArray(urls) || urls.length === 0) {
    return jsonResponse({ error: 'No hay URLs para guardar.' }, 400);
  }

  if (!GITHUB_TOKEN) {
    return jsonResponse(
      { error: 'Falta la variable GITHUB_TOKEN en Vercel. Asegúrese de agregarla y hacer Redeploy.' },
      500
    );
  }

  // Consultar la carpeta de propiedades en el repositorio privado
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
    return jsonResponse(
      { error: `No se encontró el archivo JSON en GitHub para la propiedad: ${propertySlug}` },
      404
    );
  }

  // Obtener el archivo JSON actual desde GitHub
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
  propertyJson.galeria.push(...urls);

  // Hacer COMMIT automático en GitHub mediante la API REST
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
        message: `feat(galeria): agregar ${urls.length} fotos a ${propertySlug}`,
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

  return jsonResponse({
    success: true,
    urls,
    message: '¡Fotos sincronizadas en GitHub con éxito!',
  });
}

// ─── POST handler principal ──────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.formData();
    const adminPassword = data.get('adminPassword')?.toString();

    // Verificación de Contraseña Administrativa
    if (!verificarPassword(adminPassword)) {
      return jsonResponse(
        { error: 'Contraseña de acceso de administrador inválida.' },
        403
      );
    }

    const mode = data.get('mode')?.toString();

    if (mode === 'blob') {
      return await handleBlobUpload(data);
    }

    if (mode === 'commit') {
      return await handleCommit(data);
    }

    // Modo legacy (sin campo mode): comportamiento original todo-en-uno
    // Se mantiene por retrocompatibilidad
    return jsonResponse(
      { error: 'Debe especificar un modo: "blob" o "commit".' },
      400
    );
  } catch (error: any) {
    console.error('Error en el endpoint subir-galeria:', error);
    return jsonResponse(
      { error: error.message || 'Fallo interno en el servidor.' },
      500
    );
  }
};