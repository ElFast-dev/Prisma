# Diseño: jerarquía visual de catálogo y colección

## Principios de interfaz

- **Póster primero:** en Descubrir, el póster es el único contenido visible de cada tarjeta. La interacción es un botón con nombre accesible; la ficha es la única superficie para acciones de calificación y gestión.
- **Navegación estable:** la barra superior sigue proporcionando búsqueda global, estadísticas y ajustes; la barra inferior sigue limitándose a Progreso, Descubrir y Colección.
- **Colección con tres niveles:** selector «Películas / Listas», pestañas «Historial / Pendientes / Ocultos» y herramientas contextuales agrupadas.
- **Detalles bajo demanda:** sin perder datos, el usuario ve la ficha extensa únicamente al abrir una película.
- **Mobile-first:** cuadrícula de pósteres compacta en teléfonos, áreas táctiles amplias, scroll horizontal solo para carruseles y hojas inferiores utilizables con el pulgar.

## Implementación

1. Añadir una variante `posterOnly` de `movieCard` con un único botón de póster. La variante se usará para las cuadrículas de Descubrir, tanto catálogo local como recomendaciones y resultados TMDB. Mantener la representación no compacta disponible para futuros usos que no sean Descubrir.
2. El póster usa el ID TMDB como `data-tmdb-id` y el título como fallback; al pulsar delega en la acción `details` existente. No añade interacción de rating en la cuadrícula.
3. Reordenar `renderLibrary`: el selector de Películas/Listas queda en la cabecera; las pestañas aparecen después; búsqueda, ordenar, géneros, filtro de estreno y tipo de vista comparten la barra de herramientas. La búsqueda se mantiene dentro de Colección.
4. Mantener el marcado de filas, la lógica de sorting/filters, los sheets, y el contenido de las fichas. Ajustar solo las reglas visuales y las superficies de control para que no se desborden.
5. Cambiar «Añadidos recientemente» a dos columnas en todos los tamaños, con hasta cuatro imágenes horizontales como se solicita.
6. Añadir tests Playwright para validar recursos cacheados, poster-only, apertura de detalles, orden de Colección y ajuste móvil.

## Accesibilidad

- Póster interactivo como elemento `button`, con `aria-label` como «Ver detalles de [título]».
- No anidar botones ni enlazar toda la ficha con un control secundario.
- Preservar `:focus-visible`, objetivos táctiles y contraste de títulos superpuestos sobre imágenes.

## Datos y limitaciones

No se cambia el modelo local ni se calculan nuevos datos. Las puntuaciones de IMDb/Rotten Tomatoes/Metacritic que no formen parte de la respuesta disponible se siguen representando como enlaces externos, no como valores inventados.
