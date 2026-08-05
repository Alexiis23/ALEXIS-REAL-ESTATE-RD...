import { config, fields, collection } from '@keystatic/core';

export default config({
  // 🌐 Modo de almacenamiento híbrido
  storage: import.meta.env.PROD
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

      schema: {
        // --- SECCIÓN 1: CONTENIDO EN ESPAÑOL ---
        // 💡 Al usar fields.text, el Slug se genera automáticamente en silencio
        titulo: fields.text({
          label: 'Título de la Propiedad (Español)',
          description: 'Ej. Exclusiva Villa de Lujo en Residencial Luisa Perla, Higüey',
          validation: { length: { min: 5 } }
        }),
        descripcion: fields.text({
          label: 'Descripción del Inmueble (Español)',
          description: 'Detalla las amenidades, acabados y cercanía a puntos clave en español.',
          multiline: true
        }),

        // --- SECCIÓN 2: TRADUCCIÓN A INGLÉS (OPCIONAL) ---
        titulo_en: fields.text({
          label: 'Título de la Propiedad (Inglés) - OPCIONAL',
          description: 'Déjalo vacío para traducirlo automáticamente.',
        }),
        descripcion_en: fields.text({
          label: 'Descripción del Inmueble (Inglés) - OPCIONAL',
          description: 'Déjalo vacío para traducirlo automáticamente.',
          multiline: true
        }),

        // --- SECCIÓN 3: DATOS COMERCIALES Y FINANCIEROS ---
        precioUsd: fields.number({
          label: 'Precio en Dólares (USD) - OPCIONAL',
          description: 'Ingresa el precio en USD. Ej: 285000'
        }),
        precioDop: fields.number({
          label: 'Precio en Pesos Dominicanos (DOP) - OPCIONAL',
          description: 'Ingresa el precio en RD$. Ej: 18700000'
        }),
        regimen: fields.select({
          label: 'Tipo de Contrato (Transacción)',
          options: [
            { label: 'Venta (Comprar)', value: 'Venta' },
            { label: 'Alquiler (Renta)', value: 'Alquiler' }
          ],
          defaultValue: 'Venta'
        }),
        exclusiva: fields.checkbox({
          label: '¿Propiedad en Exclusiva? 👑',
          description: 'ACTIVADO: Muestra pin exacto en el mapa. DESACTIVADO: Ofusca la zona (750m).'
        }),
        confotur: fields.checkbox({
          label: '¿Aplica para Beneficio Confotur? 🌴',
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
        habitaciones: fields.number({ label: 'Cantidad de Habitaciones', defaultValue: 0 }),
        banos: fields.number({ label: 'Cantidad de Baños', defaultValue: 0 }),
        parqueos: fields.number({ label: 'Cantidad de Parqueos', defaultValue: 0 }),
        area: fields.number({ label: 'Área / Metros Cuadrados (m²)' }),

        // --- SECCIÓN 5: CARTOGRAFÍA Y UBICACIÓN ---
        latitud: fields.number({ label: 'Coordenada de Latitud (Mapa)', description: 'Ej. 18.4231' }),
        longitud: fields.number({ label: 'Coordenada de Longitud (Mapa)', description: 'Ej. -68.72' }),
        ubicacion: fields.text({ label: 'Ubicación de Referencia', description: 'Ej. Luisa Perla, Higüey' }),

        // --- SECCIÓN 6: MULTIMEDIA NATIVA (CARGA DIRECTA VISUAL) ---
        imagenPrincipal: fields.image({
          label: '📸 Foto Principal (Portada del Inmueble)',
          description: 'Selecciona o arrastra la imagen de portada.',
          directory: 'public/images/propiedades',
          publicPath: '/images/propiedades/',
        }),
        galeria: fields.array(
          fields.image({
            label: 'Foto Secundaria',
            directory: 'public/images/propiedades',
            publicPath: '/images/propiedades/',
          }),
          {
            label: '🖼️ Galería de Fotos Secundarias',
            itemLabel: (props) => props.value ? 'Imagen cargada' : 'Añadir nueva foto',
          }
        )
      },
    }),
  },
});