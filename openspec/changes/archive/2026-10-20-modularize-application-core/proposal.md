# Propuesta: modularizar el núcleo de Prisma

## Problema

`app.js` concentra el estado, la persistencia, la identidad y normalización de películas, el recomendador, las importaciones, TMDB, las vistas y los eventos en una IIFE de unas 2.600 líneas. Parte de las pruebas depende de extraer texto de ese archivo, de modo que la estructura dificulta el mantenimiento y hace frágil la verificación.

## Objetivo

Convertir las responsabilidades del cliente en módulos nativos pequeños, con interfaces explícitas y pruebas independientes, conservando el despliegue estático, el perfil local, TMDB opcional y el funcionamiento esperado en GitHub Pages.

## Alcance

- Extraer las utilidades puras de identidad, normalización y validación de registros de película.
- Separar la persistencia del navegador.
- Encapsular perfil, predicciones y evaluación del recomendador en un módulo con dependencias explícitas.
- Separar los analizadores de CSV y JSON personal de la interfaz y la persistencia.
- Convertir la entrada de la aplicación a un módulo ES y documentar el mapa de módulos.
- Actualizar pruebas, verificación SDD, invalidación del service worker y verificación de la app publicada.
- Establecer reglas para que la modularización continúe por responsabilidades y no vuelva a crecer un único controlador monolítico.

## Fuera de alcance

- Cambiar algoritmos, puntuaciones, textos de interfaz o comportamientos del producto.
- Añadir un servidor, framework de UI, dependencia de ejecución o proceso de compilación.
- Cambiar el formato de los datos personales guardados o los formatos de importación/exportación.

## Criterios de aceptación

1. Las funciones extraídas se importan mediante interfaces explícitas y no duplican la implementación en `app.js`.
2. Las pruebas del recomendador y de importación ejercitan los módulos directamente, sin extraer código por marcadores textuales.
3. La suite de calidad comprueba los límites entre módulos y las rutas de importación.
4. GitHub Pages carga la entrada como ES module, y el service worker almacena los módulos locales necesarios bajo una caché nueva.
5. Los módulos extraídos no acceden directamente al DOM ni a datos personales globales salvo que esa dependencia forme parte explícita de su interfaz.
6. Se ejecutan validación SDD, pruebas sintéticas y verificación de la versión desplegada antes de cerrar el cambio.

## Riesgos

El mayor riesgo es una regresión silenciosa causada por dependencias implícitas del archivo monolítico. Se mitiga extrayendo primero unidades con límites claros, inyectando dependencias en el motor, migrando las pruebas a interfaces públicas y evitando cambios de comportamiento.
