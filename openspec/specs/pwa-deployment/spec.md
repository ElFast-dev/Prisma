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

### Requirement: Invalidación coherente de recursos versionados

Cuando cambie JavaScript, CSS o cualquier recurso estático incluido en la caché del shell, Prisma DEBE publicar una URL versionada nueva para el recurso modificado y un nombre de caché del shell nuevo. El inventario del service worker y las comprobaciones automatizadas de la versión publicada DEBEN usar el mismo URL que index.html.

#### Scenario: Se publica una versión nueva de un recurso estático

- DADO que cambia el contenido de app.js
- CUANDO se prepara una publicación estática de Prisma
- ENTONCES index.html y APP_ASSETS usan el mismo query string nuevo y el service worker crea una caché de shell de versión nueva

#### Scenario: Detección de versiones desincronizadas

- DADO que index.html, el service worker o la prueba de UI declaran URL diferentes para app.js
- CUANDO CI ejecuta la prueba de coherencia de recursos
- ENTONCES la prueba falla con un mensaje que identifica la discrepancia
