# Diseño: inicio vacío y descubrimiento desde TMDB

## Decisión

Retirar la fuente de catálogo estático en lugar de ocultar las tarjetas mediante filtros de interfaz. La inicialización sólo leerá el estado personal, el catálogo que la persona importó explícitamente y la credencial TMDB guardada en este navegador. El modelo de catálogo no recibirá una dependencia de datos de muestra.

## Flujo de datos

1. La instalación nueva lee un estado personal vacío y un catálogo personalizado vacío.
2. El modelo combina sólo registros explícitos de la persona: catálogo importado, historial, pendientes, ocultos y valoraciones existentes.
3. Descubrir seguirá consultando TMDB al abrirse si hay una credencial configurada. Los resultados remotos permanecen identificados por su ID de TMDB y su procedencia.
4. Cuando no hay catálogo personal, la interfaz lo dirá explícitamente en lugar de invitar a abrir una colección vacía o suplir datos con títulos empaquetados.

## Compatibilidad y privacidad

- No se elimina ni se reescribe ninguna clave de almacenamiento existente.
- El catálogo personalizado guardado por la persona y el estado personal se conservan.
- La importación de historial y el catálogo CSV siguen siendo acciones voluntarias explícitas.
- La credencial TMDB sigue guardada únicamente en el navegador.
- Se elimina data/catalog.json de los recursos publicados y del inventario del service worker.

## Verificación

- Prueba unitaria del ciclo de inicio con almacenamiento vacío: no pide el antiguo archivo del catálogo, no agrega películas y renderiza una vista.
- Prueba del modelo de catálogo sin fuentes personales: colección combinada vacía.
- Prueba de contrato de UI: estado vacío honesto y sin tarjetas predeterminadas.
- Playwright del sitio publicado verifica el cero inicial antes de importar fixtures sintéticos para pruebas posteriores.
- Checks estáticos, SDD, arquitectura modular y caché PWA.
