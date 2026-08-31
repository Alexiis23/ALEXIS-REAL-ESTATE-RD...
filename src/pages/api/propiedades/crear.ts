import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';

export const prerender = false;

// Variables de entorno (mismas que subir-galeria.ts)
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

function verificarPassword(adminPassword: string | undefined) {
  const correctPassword =
    import.meta.env.ADMIN_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    'alexis-admin-2026';
  return adminPassword && adminPassword === correctPassword;
}

function generarSlug(titulo: string): string {
  return titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    // Verificación de contraseña
    if (!verificarPassword(data.adminPassword)) {
      return jsonResponse(
        { error: 'Contraseña de administrador inválida.' },
        403
      );
    }

    // Validación mínima
    if (!data.titulo || data.titulo.trim().length < 5) {
      return jsonResponse(
        { error: 'El título debe tener al menos 5 caracteres.' },
        400
      );
    }

    const slug = generarSlug(data.titulo);

    // Estructura JSON idéntica al schema de Keystatic
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

    // Campos opcionales de video (solo si tienen valor)
    if (data.tipoVideo) {
      propiedadData.tipoVideo = data.tipoVideo;
    }
    if (data.videoUrl) {
      propiedadData.videoUrl = data.videoUrl;
    }

    const jsonContent = JSON.stringify(propiedadData, null, 2);
    const fileName = `${slug}.json`;
    const filePath = `src/content/propiedades/${fileName}`;

    if (import.meta.env.PROD) {
      // ─── PRODUCCIÓN: GitHub REST API ─────────────────
      if (!GITHUB_TOKEN) {
        return jsonResponse(
          { error: 'Falta la variable GITHUB_TOKEN en el entorno de producción.' },
          500
        );
      }

      const ghUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

      // Verificar si ya existe un archivo con ese slug
      const checkRes = await fetch(`${ghUrl}?ref=${GITHUB_BRANCH}`, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Astro-PropTech-App',
        },
      });

      if (checkRes.ok) {
        return jsonResponse(
          { error: `Ya existe una propiedad con el slug "${slug}". Cambia el título.` },
          409
        );
      }

      // Crear el archivo en GitHub
      const createRes = await fetch(ghUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Astro-PropTech-App',
        },
        body: JSON.stringify({
          message: `feat(propiedades): alta de ${slug} desde publicador unificado`,
          content: Buffer.from(jsonContent).toString('base64'),
          branch: GITHUB_BRANCH,
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json();
        throw new Error(`Error en GitHub API: ${errData.message || 'Desconocido'}`);
      }
    } else {
      // ─── DESARROLLO: Sistema de archivos local ───────
      const dirPath = path.join(process.cwd(), 'src/content/propiedades');
      const fullPath = path.join(dirPath, fileName);

      // Verificar si ya existe
      try {
        await fs.access(fullPath);
        return jsonResponse(
          { error: `Ya existe una propiedad con el slug "${slug}". Cambia el título.` },
          409
        );
      } catch {
        // No existe, podemos crear
      }

      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(fullPath, jsonContent, 'utf-8');
    }

    return jsonResponse({
      success: true,
      slug,
      message: `Propiedad "${data.titulo}" creada exitosamente.`,
    });
  } catch (error: any) {
    console.error('Error al crear propiedad:', error);
    return jsonResponse(
      { error: error.message || 'Error interno del servidor.' },
      500
    );
  }
};
