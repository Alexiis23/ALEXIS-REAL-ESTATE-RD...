/**
 * Utilidades de conversión de moneda USD ↔ DOP
 * 
 * Tasa de cambio fija configurable.
 * Si en el futuro se necesita una API de tasa en tiempo real,
 * solo hay que modificar este archivo.
 */

/** 1 USD = X DOP */
export const TASA_USD_A_DOP = 61;

/** Convierte dólares a pesos dominicanos */
export function usdToDop(usd: number): number {
  return Math.round(usd * TASA_USD_A_DOP);
}

/** Convierte pesos dominicanos a dólares */
export function dopToUsd(dop: number): number {
  return Math.round(dop / TASA_USD_A_DOP);
}

/**
 * Resuelve los precios en ambas monedas.
 * 
 * Lógica de prioridad:
 * - Si hay ambos valores → se usan tal cual (el usuario los puso manualmente)
 * - Si solo hay USD → se calcula DOP automáticamente
 * - Si solo hay DOP → se calcula USD automáticamente
 * - Si no hay ninguno → ambos quedan en 0
 * 
 * @param precioUsd - Precio en dólares (puede venir de `precioUsd` o del legacy `precio`)
 * @param precioDop - Precio en pesos dominicanos
 */
export function resolverPrecios(
  precioUsd?: number | string | null,
  precioDop?: number | string | null
): { usd: number; dop: number } {
  const usd = Number(precioUsd) || 0;
  const dop = Number(precioDop) || 0;

  // Ambos proporcionados → respetar ambos
  if (usd > 0 && dop > 0) {
    return { usd, dop };
  }

  // Solo USD → calcular DOP
  if (usd > 0) {
    return { usd, dop: usdToDop(usd) };
  }

  // Solo DOP → calcular USD
  if (dop > 0) {
    return { usd: dopToUsd(dop), dop };
  }

  // Ninguno
  return { usd: 0, dop: 0 };
}
