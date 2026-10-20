# PWA y publicación

## Requirements

### Requirement: Despliegue estático

Prisma DEBE publicarse como una aplicación estática y conservar las rutas relativas que funcionan en el subdirectorio de GitHub Pages de este repositorio.

#### Scenario: Publicación en GitHub Pages

- DADO un push a la rama principal que activa el workflow de despliegue
- CUANDO GitHub Pages publica el artefacto
- ENTONCES la aplicación carga HTML, estilos, JavaScript, catálogo y activos desde las rutas del sitio

### Requirement: Caché versionada

El service worker DEBE mantener una caché de shell identificable por versión y eliminar versiones antiguas de su propia caché cuando se activa el nuevo worker.

#### Scenario: Nueva versión del shell

- DADO que se publica una actualización con un nombre de caché nuevo
- CUANDO se activa el nuevo service worker
- ENTONCES las cachés anteriores del shell Prisma se eliminan

### Requirement: Recuperación offline limitada

Prisma DEBE describir el soporte offline como limitado por los recursos previamente almacenados, sin prometer que las búsquedas remotas o las nuevas imágenes funcionen sin conexión.

#### Scenario: Navegación sin conexión

- DADO que el navegador no tiene conexión y existe una copia cacheada del documento principal
- CUANDO se solicita una navegación a la aplicación
- ENTONCES el service worker intenta servir el documento guardado
