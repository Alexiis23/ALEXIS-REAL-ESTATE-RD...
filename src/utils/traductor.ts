/**
 * src/utils/traductor.ts
 *
 * Motor centralizado y robusto de auto-traducción (ES → EN) para Alexis RD Real Estate.
 *
 * ARQUITECTURA DE TRADUCCIÓN:
 *   1. Prioridad Manual: Si Keystatic tiene 'titulo_en' o 'descripcion_en', se respeta sin llamar APIs.
 *   2. Memoria Caché: Evita re-traducir frases idénticas en el servidor.
 *   3. Proveedor Primario (DeepL): Traducción neuronal de alta precisión inmobiliaria.
 *   4. Proveedor Secundario (Google Translate): Fallback instantáneo y sin cuota si DeepL falla.
 *   5. Fallback Final Seguro: Retorna texto original en español si la red no responde, evitando caídas del SSR.
 */

import * as deepl from 'deepl-node';

// ---------------------------------------------------------------------------
// 1. CACHÉ EN MEMORIA
// ---------------------------------------------------------------------------
const translationCache = new Map<string, string>();

// ---------------------------------------------------------------------------
// 2. TIPOS E INTERFACES
// ---------------------------------------------------------------------------
export interface PropiedadData {
  titulo?: string;
  descripcion?: string;
  titulo_en?: string;
  descripcion_en?: string;
  tipo?: string;
  estado?: string;
  ubicacion?: string;
  [key: string]: unknown;
}

export interface ContenidoLocalizado {
  titulo: string;
  descripcion: string;
  tipo: string;
  estado: string;
  ubicacion: string;
}

// ---------------------------------------------------------------------------
// 3. SINGLETON DEEPL TRANSLATOR
// ---------------------------------------------------------------------------
let _translatorSingleton: deepl.Translator | null | undefined = undefined;

function getDeepLTranslator(): deepl.Translator | null {
  if (_translatorSingleton !== undefined) return _translatorSingleton;

  const apiKey =
    (import.meta.env?.DEEPL_AUTH_KEY as string) ||
    (process.env?.DEEPL_AUTH_KEY as string) ||
    'cfcc4e7f-2356-4f78-a8e3-3bc2bc6aafb4:fx';

  if (!apiKey) {
    _translatorSingleton = null;
    return null;
  }

  try {
    _translatorSingleton = new deepl.Translator(apiKey);
    return _translatorSingleton;
  } catch (e) {
    console.warn('[Traductor] No se pudo inicializar DeepL, usando Google Translate como fallback:', e);
    _translatorSingleton = null;
    return null;
  }
}

// ---------------------------------------------------------------------------
// 4. FALLBACK A GOOGLE TRANSLATE
// ---------------------------------------------------------------------------
async function traducirConGoogle(texto: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=en&dt=t&q=${encodeURIComponent(texto)}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (Array.isArray(data?.[0])) {
      const traducido = data[0].map((item: any) => item[0]).join('');
      return traducido || null;
    }
    return null;
  } catch (error) {
    console.warn('[Traductor] Google Translate fallback error:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 5. FUNCIÓN PRINCIPAL DE TRADUCCIÓN (CON CACHÉ Y FALLBACK MULTICAPA)
// ---------------------------------------------------------------------------
export async function traducirTexto(
  texto: string | undefined,
  translator?: deepl.Translator | null
): Promise<string> {
  if (!texto || texto.trim() === '') return '';

  const cacheKey = texto.trim();
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // 1. Intentar con DeepL
  const deepL = translator ?? getDeepLTranslator();
  if (deepL) {
    try {
      const res = await deepL.translateText(cacheKey, null, 'en-US');
      if (res?.text) {
        translationCache.set(cacheKey, res.text);
        return res.text;
      }
    } catch (deeplErr) {
      console.warn(`[Traductor] DeepL no disponible para "${cacheKey.slice(0, 30)}...", activando fallback de Google.`);
    }
  }

  // 2. Intentar con Google Translate (Fallback de alta resiliencia)
  const googleRes = await traducirConGoogle(cacheKey);
  if (googleRes) {
    translationCache.set(cacheKey, googleRes);
    return googleRes;
  }

  // 3. Fallback de seguridad: retornar original
  return texto;
}

// ---------------------------------------------------------------------------
// 6. OBTENER CONTENIDO LOCALIZADO COMPLETO
// ---------------------------------------------------------------------------
export async function obtenerContenidoLocalizado(
  propiedad: PropiedadData,
  lang: 'es' | 'en' = 'es',
  entryId?: string
): Promise<ContenidoLocalizado> {
  const fallbackTitle = (entryId || (propiedad.id as string) || '').replace(/-/g, ' ').trim();
  const tituloEs = (propiedad.titulo && propiedad.titulo.trim() !== '') ? propiedad.titulo.trim() : fallbackTitle;
  const descripcionEs = propiedad.descripcion ?? '';
  const tipoEs = propiedad.tipo ?? 'Apartamento';
  const estadoEs = propiedad.estado ?? 'En planos';
  const ubicacionEs = propiedad.ubicacion ?? 'República Dominicana';

  if (lang === 'es') {
    return {
      titulo: tituloEs,
      descripcion: descripcionEs,
      tipo: tipoEs,
      estado: estadoEs,
      ubicacion: ubicacionEs,
    };
  }

  // Prioridad 1: Manual en Keystatic
  // Prioridad 2: Auto-traducción en servidor
  const [titulo, descripcion, tipo, estado, ubicacion] = await Promise.all([
    propiedad.titulo_en?.trim()
      ? Promise.resolve(propiedad.titulo_en.trim())
      : traducirTexto(tituloEs),

    propiedad.descripcion_en?.trim()
      ? Promise.resolve(propiedad.descripcion_en.trim())
      : traducirTexto(descripcionEs),

    traducirTexto(tipoEs),
    traducirTexto(estadoEs),
    traducirTexto(ubicacionEs),
  ]);

  return {
    titulo: titulo || tituloEs,
    descripcion: descripcion || descripcionEs,
    tipo: tipo || tipoEs,
    estado: estado || estadoEs,
    ubicacion: ubicacion || ubicacionEs,
  };
}

