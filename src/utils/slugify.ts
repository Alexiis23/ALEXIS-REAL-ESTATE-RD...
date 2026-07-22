/**
 * Normaliza un ID/título de propiedad a un slug URL-safe.
 * Convierte a minúsculas, elimina acentos y caracteres especiales,
 * y reemplaza espacios por guiones.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Eliminar marcas diacríticas (acentos)
    .replace(/[^a-z0-9]+/g, '-')      // Reemplazar todo no-alfanumérico con guiones
    .replace(/^-+|-+$/g, '')           // Eliminar guiones al inicio/final
    .replace(/-{2,}/g, '-');           // Colapsar guiones múltiples
}
