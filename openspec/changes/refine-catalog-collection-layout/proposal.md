# Propuesta: ordenar Descubrir, Colección y las fichas

## Estado

Preparado bajo SDD. El cambio debe pasar las pruebas de navegador en escritorio y móvil y la revisión de los flujos existentes antes de integrarse.

## Problema observado

En Descubrir, cada tarjeta ocupa mucho espacio con título, año, géneros, puntuación estimada y dos botones. Esto duplica la información que ya se presenta al abrir la ficha y hace que la cuadrícula parezca una lista de tarjetas de acciones en lugar de un catálogo cinematográfico. En Colección, el título «Colección» y los controles separados fragmentan la jerarquía que debería comenzar con «Películas» y «Listas».

## Objetivo

Adoptar una jerarquía simple y repetible: barra superior global, una pantalla a la vez, controles de sección agrupados, pósteres limpios en Descubrir y fichas completas al abrir cada película.

## Alcance

- Convertir las tarjetas de las cuadrículas de Descubrir (recomendaciones, catálogo local y resultados TMDB) en botones de póster que abren la ficha completa, sin texto de metadatos, nota estimada ni acciones duplicadas fuera del póster.
- Situar «Películas» y «Listas» como selector principal de Colección y agrupar búsqueda, ordenar, géneros, filtro «Estrenada» y alternancia de vista en una sola fila de herramientas adaptable.
- Presentar «Añadidos recientemente» como una cuadrícula de dos columnas por dos filas con póster horizontal y título superpuesto.
- Afinar la jerarquía, el espaciado, la alineación y los estados táctiles/foco de listas, hojas inferiores y fichas existentes sin eliminar sus capacidades.
- Reforzar pruebas de navegador para las cuadrículas de pósteres, apertura de ficha, pestañas de Colección y diseño móvil.
- Actualizar la especificación y archivar el expediente solo después de que los checks finales pasen.

## Fuera de alcance

- No cambiar el algoritmo ni el orden de las recomendaciones.
- No alterar las valoraciones, fechas, notas, listas, metadatos ni el almacenamiento del usuario.
- No inventar puntuaciones de críticos ni proveedores de streaming que TMDB no devuelva; los enlaces externos existentes seguirán identificados como enlaces.
- No añadir framework, dependencia de producción, servidor ni llamadas de red nuevas.

## Criterios de aceptación

1. Las cuadrículas de Descubrir muestran el póster como superficie principal; con imagen disponible no se superponen título, año, metadatos, nota estimada ni botones «Detalles/Calificar».
2. Pulsar un póster abre la ficha completa de la misma identidad de película, y las diez estrellas y acciones de la ficha siguen funcionando.
3. Colección comienza con «Películas» y «Listas» en extremos opuestos, sin una cabecera redundante «Colección».
4. Los controles de Historial, Pendientes, Ocultos, buscar, ordenar, géneros, «Estrenada» y vista compacta/lista siguen operativos.
5. «Añadidos recientemente» muestra hasta cuatro pósteres en una cuadrícula 2×2, con título/año legibles sobre el fondo.
6. Las listas mantienen fecha azul, sinopsis truncada, nota personal en tono claro y puntuación pública azul; Pendientes no muestra nota personal.
7. La ficha de película y persona conserva la información disponible y su estructura responsive.
8. Los workflows SDD/calidad, validación de catálogo y Playwright de escritorio/móvil pasan en el commit final.
