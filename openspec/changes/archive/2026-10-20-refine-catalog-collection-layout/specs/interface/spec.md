# Interfaz: jerarquía de catálogo y colección

## ADDED Requirements

### Requirement: Cuadrícula de Descubrir centrada en el póster

Prisma DEBE mostrar las películas de las cuadrículas de Descubrir como pósteres interactivos, sin duplicar en las tarjetas el título, metadatos, predicción ni acciones disponibles en la ficha. Cada póster DEBE abrir la ficha de la identidad seleccionada.

#### Scenario: Catálogo local con póster disponible

- DADO que el catálogo local contiene una película con imagen de póster
- CUANDO se muestra la cuadrícula de Descubrir
- ENTONCES solo se ve la carátula sin título externo, año, géneros, nota estimada ni botones de acciones

#### Scenario: Abrir una película desde su póster

- DADO un póster de una película en Descubrir
- CUANDO se pulsa o se activa mediante teclado el póster
- ENTONCES se abre la ficha completa de esa película con sus acciones y datos disponibles

#### Scenario: Película sin carátula disponible

- DADO que un registro no tiene imagen de póster
- CUANDO aparece en la cuadrícula
- ENTONCES se muestra un fallback visual con el título y la acción sigue siendo accesible

### Requirement: Jerarquía limpia en Colección

Prisma DEBE presentar «Películas» y «Listas» como selector principal de la vista Colección, seguido de las pestañas de historial/pendientes/ocultos y una barra agrupada de herramientas de la colección activa.

#### Scenario: Orden de controles de Colección

- DADO que se abre Colección en modo Películas
- CUANDO se presenta la vista
- ENTONCES Películas/Listas aparecen primero, después Historial/Pendientes/Ocultos, y después búsqueda/orden/géneros/filtro/vista

#### Scenario: Herramientas según pestaña activa

- DADO que la pestaña Pendientes está activa
- CUANDO se presentan sus herramientas
- ENTONCES se incluye el filtro «Estrenada» además de buscar, ordenar, géneros y alternar vista

### Requirement: Diseño de recientes en dos por dos

La sección de recientes DEBE mostrar hasta cuatro películas en una cuadrícula de dos columnas y dos filas, con póster horizontal, año y título superpuestos y legibles.

#### Scenario: Historial con cuatro o más películas

- DADO un historial con cuatro o más títulos
- CUANDO se muestra Historial
- ENTONCES Añadidos recientemente presenta los cuatro registros más recientes en una cuadrícula 2×2
