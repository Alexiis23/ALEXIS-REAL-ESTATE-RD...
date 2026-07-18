export const translations = {
  es: {
    'nav.catalogo': '← VOLVER AL CATÁLOGO',
    'nav.contacto': '💬 Contactar Agente',
    'hero.titulo': 'Nuestras Propiedades',
    'hero.subtitulo': 'Descubre las mejores oportunidades de inversión en Santo Domingo, Punta Cana y las zonas más exclusivas de la República Dominicana.',
    'btn.mapa': '🗺️ Vista de Mapa Global',
    'card.precio': 'Precio de Inversión',
    'card.consultar': '💬 Consultar',
    'card.area': 'Área'
  },
  en: {
    'nav.catalogo': '← BACK TO CATALOG',
    'nav.contacto': '💬 Contact Agent',
    'hero.titulo': 'Our Properties',
    'hero.subtitulo': 'Discover the best investment opportunities in Santo Domingo, Punta Cana, and the most exclusive areas of the Dominican Republic.',
    'btn.mapa': '🗺️ Global Map View',
    'card.precio': 'Investment Price',
    'card.consultar': '💬 Inquiry',
    'card.area': 'Area'
  }
};

export function useTranslations(locale: 'es' | 'en') {
  return function t(key: keyof typeof translations['es']) {
    return translations[locale][key] || translations['es'][key];
  };
}