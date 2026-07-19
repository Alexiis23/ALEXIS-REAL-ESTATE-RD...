import { config, fields, collection } from '@keystatic/core';

export default config({
  // 🌐 Modo de almacenamiento híbrido: GitHub en Vercel, Local en desarrollo
  storage: process.env.NODE_ENV === 'production'
    ? {
      kind: 'github',
      repo: 'Alexiis23/ALEXIS-REAL-ESTATE-RD...',
    }
    : {
      kind: 'local',
    },

  collections: {
    propiedades: collection({
      label: 'Propiedades Inmobiliarias',
      slugField: 'titulo',
      path: 'src/content/propiedades/*',
      format: { data: 'json' },

      // 🌟 INTERFAZ PREMIUM DISEÑADA PARA TU PADRE
      schema: {
        // --- SECCIÓN 1: CONTENIDO EN ESPAÑOL ---
        titulo: fields.text({
          label: 'Título de la Propiedad (Español)',
          description: 'Ej. Exclusivo Penthouse con Vista al Mar en Juan Dolio',
          validation: { length: { min: 5 } }
        }),
        descripcion: fields.text({
          label: 'Descripción del Inmueble (Español)',
          description: 'Detalla las amenidades, acabados y cercanía a puntos clave en español.',
          multiline: true
        }),

        // --- SECCIÓN 2: TRADUCCIÓN A INGLÉS (CAMPOS ESPEJO OPCIONALES) ---
        titulo_en: fields.text({
          label: 'Título de la Propiedad (Inglés) - OPCIONAL',
          description: 'Déjalo vacío para traducirlo automáticamente con DeepL.',
        }),
        descripcion_en: fields.text({
          label: 'Descripción del Inmueble (Inglés) - OPCIONAL',
          description: 'Déjalo vacío para traducirlo automáticamente con DeepL.',
          multiline: true
        }),

        // --- SECCIÓN 3: DATOS COMERCIALES Y FINANCIEROS ---
        precio: fields.number({
          label: 'Precio de Venta o Renta (USD)',
          description: 'Solo números, sin comas ni puntos. Ej: 285000'
        }),
        regimen: fields.select({
          label: 'Tipo de Contrato (Transacción)',
          description: 'Determina si saldrá en la sección de Comprar o de Alquilar.',
          options: [
            { label: 'Venta (Comprar)', value: 'Venta' },
            { label: 'Alquiler (Renta)', value: 'Alquiler' }
          ],
          defaultValue: 'Venta'
        }),
        exclusiva: fields.checkbox({
          label: '¿Propiedad en Exclusiva? 👑',
          description: 'ACTIVADO: Muestra pin exacto en el mapa. DESACTIVADO: Ofusca la zona (radio de 750m) para proteger tu comisión.'
        }),
        confotur: fields.checkbox({
          label: '¿Aplica para el Beneficio de la Ley de Confotur? 🌴',
          description: 'Exime al cliente del 3% de transferencia inmobiliaria de la DGII.'
        }),

        // --- SECCIÓN 4: CARACTERÍSTICAS FÍSICAS ---
        tipo: fields.select({
          label: 'Tipo de Propiedad',
          options: [
            { label: 'Villa', value: 'Villa' },
            { label: 'Apartamento', value: 'Apartamento' },
            { label: 'Casa', value: 'Casa' },
            { label: 'Solar / Terreno', value: 'Solar' }
          ],
          defaultValue: 'Apartamento'
        }),
        estado: fields.select({
          label: 'Estado del Proyecto',
          options: [
            { label: 'En planos', value: 'En planos' },
            { label: 'En construcción', value: 'En construcción' },
            { label: 'Listo para entrega', value: 'Listo' }
          ],
          defaultValue: 'En planos'
        }),
        habitaciones: fields.number({
          label: 'Cantidad de Habitaciones',
          defaultValue: 0
        }),
        banos: fields.number({
          label: 'Cantidad de Baños',
          defaultValue: 0
        }),
        parqueos: fields.number({
          label: 'Cantidad de Parqueos',
          defaultValue: 0
        }),
        area: fields.number({
          label: 'Área / Metros Cuadrados (m²)',
          description: 'Esencial para solares o terrenos.'
        }),

        // --- SECCIÓN 5: CARTOGRAFÍA Y MULTIMEDIA ---
        latitud: fields.number({
          label: 'Coordenada de Latitud (Mapa)',
          description: 'Ej. 18.4231'
        }),
        longitud: fields.number({
          label: 'Coordenada de Longitud (Mapa)',
          description: 'Ej. -69.4124'
        }),
        ubicacion: fields.text({
          label: 'Ubicación de Referencia Textual',
          description: 'Ej. Bávaro, Punta Cana o Piantini, Distrito Nacional'
        }),
        imagenPrincipal: fields.image({
          label: 'Foto Principal del Inmueble',
          description: 'La portada de la propiedad en el catálogo.',
          directory: 'src/assets/propiedades',
          publicPath: '../../assets/propiedades/',
        }),
        galeria: fields.array(
          fields.image({
            label: 'Imagen de la Galería',
            directory: 'src/assets/propiedades',
            publicPath: '../../assets/propiedades/',
          }),
          {
            label: 'Galería de fotos secundarias',
            itemLabel: props => 'Foto de la propiedad',
          }
        )
      },
    }),
  },
});