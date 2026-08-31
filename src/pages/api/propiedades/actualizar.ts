import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';

export const prerender = false;

const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
const GITHUB_OWNER = import.meta.env.GITHUB_OWNER || process.env.GITHUB_OWNER || 'Alexiis23';
const GITHUB_REPO = import.meta.env.GITHUB_REPO || process.env.GITHUB_REPO || 'ALEXIS-REAL-ESTATE-RD';
const GITHUB_BRANCH = 'main';

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function verificarPassword(password: string | undefined) {
  const correctPassword =
    import.meta.env.ADMIN_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    'alexis-admin-2026';
  return password && password === correctPassword;
}

// Normaliza texto para comparación insensible a acentos/mayúsculas
const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    // Verificación de contraseña
    if (!verificarPassword(data.password)) {
      return jsonResponse(
        { error: 'Contraseña de administrador inválida.' },
        403
      );
    }

    if (!data.slug) {
      return jsonResponse(
        { error: 'Se requiere el slug del inmueble.' },
        400
      );
    }

    // Estructura JSON normalizada (idéntica al schema de Keystatic)
    const propiedadData: Record<string, unknown> = {
      titulo: data.titulo?.trim() || '',
      descripcion: data.descripcion || '',
      titulo_en: data.titulo_en || '',
      descripcion_en: data.descripcion_en || '',
      precioUsd: Number(data.precioUsd) || 0,
      precioDop: Number(data.precioDop) || 0,
      regimen: data.regimen || 'Venta',
      exclusiva: Boolean(data.exclusiva),
      confotur: Boolean(data.confotur),
      tipo: data.tipo || 'Apartamento',
      estado: data.estado || 'En planos',
      habitaciones: Number(data.habitaciones) || 0,
      banos: Number(data.banos) || 0,
      parqueos: Number(data.parqueos) || 0,
      area: Number(data.area) || 0,
      latitud: Number(data.latitud) || 0,
      longitud: Number(data.longitud) || 0,
      ubicacion: data.ubicacion || '',
      imagenPrincipal: data.imagenPrincipal || '',
      galeria: Array.isArray(data.galeria) ? data.galeria : [],
    };

    // Campos opcionales de video
    if (data.tipoVideo) propiedadData.tipoVideo = data.tipoVideo;
    if (data.videoUrl) propiedadData.videoUrl = data.videoUrl;

    const jsonContent = JSON.stringify(propiedadData, null, 2);
    const slug = data.slug;

    if (import.meta.env.PROD) {
      // ─── PRODUCCIÓN: GitHub REST API con SHA ─────────
      if (!GITHUB_TOKEN) {
        return jsonResponse(
          { error: 'Falta la variable GITHUB_TOKEN en el entorno de producción.' },
          500
        );
      }

      // 1. Listar archivos en la carpeta para encontrar el correcto
      const folderUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/src/content/propiedades?ref=${GITHUB_BRANCH}`;
      const folderRes = await fetch(folderUrl, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Astro-PropTech-App',
        },
      });

      if (!folderRes.ok) {
        throw new Error('No se pudo acceder a la carpeta de propiedades en GitHub.');
      }

      const folderItems: Array<{ name: string; path: string; sha: string }> = await folderRes.json();

      // Búsqueda normalizada (insensible a tildes/mayúsculas)
      const targetFile = folderItems.find(
        (item) => normalizar(item.name.replace(/\.json$/, '')) === normalizar(slug)
      );

      if (!targetFile) {
        return jsonResponse(
          { error: `No se encontró el archivo para la propiedad "${slug}" en GitHub.` },
          404
        );
      }

      // 2. Obtener SHA actual del archivo
      const fileUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${targetFile.path}?ref=${GITHUB_BRANCH}`;
      const fileRes = await fetch(fileUrl, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Astro-PropTech-App',
        },
      });

      if (!fileRes.ok) {
        throw new Error('No se pudo obtener el SHA del archivo en GitHub.');
      }

      const fileData = await fileRes.json();
      const currentSha = fileData.sha;

      // 3. Commit de actualización con SHA
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
            message: `fix(propiedades): actualizar ${slug} desde editor admin`,
            content: Buffer.from(jsonContent).toString('base64'),
            sha: currentSha,
            branch: GITHUB_BRANCH,
          }),
        }
      );

      if (!updateRes.ok) {
        const errData = await updateRes.json();
        throw new Error(`Error en GitHub API: ${errData.message || 'Desconocido'}`);
      }
    } else {
      // ─── DESARROLLO: Sistema de archivos local ───────
      const dirPath = path.join(process.cwd(), 'src/content/propiedades');

      // Buscar el archivo real (nombres con espacios/tildes/mayúsculas)
      const files = await fs.readdir(dirPath);
      const targetFile = files.find(
        (f) => f.endsWith('.json') && normalizar(f.replace(/\.json$/, '')) === normalizar(slug)
      );

      if (!targetFile) {
        return jsonResponse(
          { error: `No se encontró el archivo local para la propiedad "${slug}".` },
          404
        );
      }

      const fullPath = path.join(dirPath, targetFile);
      await fs.writeFile(fullPath, jsonContent, 'utf-8');
    }

    return jsonResponse({
      success: true,
      slug,
      message: `Propiedad "${slug}" actualizada exitosamente.`,
    });
  } catch (error: any) {
    console.error('Error al actualizar propiedad:', error);
    return jsonResponse(
      { error: error.message || 'Error interno del servidor.' },
      500
    );
  }
};
