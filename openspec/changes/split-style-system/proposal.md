# Propuesta: dividir el sistema visual de Prisma

## Problema

Aunque los estilos de Prisma ya están organizados por secciones en un único archivo, `styles.css` supera las 1.900 líneas y mezcla la base visual, tarjetas, modales, responsive, colección, catálogo y detalles. Las correcciones visuales requieren navegar por un archivo muy largo y es fácil introducir overrides fuera de su contexto.

## Objetivo

Separar el sistema visual en hojas de estilo pequeñas con responsabilidades reconocibles, sin cambiar las reglas CSS ni el orden de la cascada.

## Alcance

- Dividir el archivo existente en módulos de estilos por secciones visuales.
- Conservar literalmente las reglas y el orden relativo de todas las declaraciones.
- Cargar los módulos en el orden que reproduce la cascada actual.
- Versionar las URLs de las hojas de estilo, actualizar el service worker y mantener el soporte offline.
- Añadir una prueba automática de módulos, orden, existencia, versión y caché.

## Fuera de alcance

- Rediseñar colores, tipografía, diseño, animaciones o comportamiento responsive.
- Introducir CSS preprocessors, frameworks de estilos o pasos de compilación.
- Reescribir selectores o refactorizar reglas duplicadas; eso se hará en cambios posteriores con capturas de referencia.

## Criterios de aceptación

1. Cada regla original permanece intacta y en el mismo orden que antes.
2. Todas las hojas de estilo son módulos con nombres que reflejan su responsabilidad.
3. HTML y service worker declaran las mismas URLs versionadas para los estilos.
4. CI falla si falta un archivo, cambia el orden de carga, se pierde una URL versionada o falta un recurso en la caché.
5. Las pruebas y capturas Playwright en escritorio y móvil pasan.
