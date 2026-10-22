# PWA y publicación

## Requirements

### Requirement: Concurrencia segura de despliegues aprobados

El workflow de GitHub Pages DEBE serializar los despliegues sin permitir que una ejecución omitida, fallida o cancelada de Playwright cancele una publicación aprobada que ya esté en curso. La compuerta del job DEBE continuar exigiendo que la ejecución de Playwright asociada a `main` haya concluido correctamente, que el evento original sea `workflow_run` y que el artefacto confirme el SHA exacto probado.

#### Scenario: Evento antiguo o cancelado mientras se publica

- DADO que un despliegue aprobado ya está publicando el SHA comprobado por Playwright
- CUANDO termina otra ejecución de capturas que fue cancelada y su workflow de publicación queda omitido
- ENTONCES esa ejecución no interrumpe el despliegue aprobado en curso

#### Scenario: Dos despliegues válidos

- DADO que dos SHA distintos pasaron calidad y Playwright
- CUANDO sus workflows de publicación se solapan
- ENTONCES GitHub Pages ejecuta los despliegues de forma serial y mantiene como estado final el SHA aprobado más reciente, sin cancelaciones provocadas por eventos no aprobados

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

### Requirement: Identidad visual coherente del icono PWA

El favicon, el isotipo visible en el encabezado y el icono declarado en el manifest DEBEN utilizar el mismo SVG versionado y la paleta neutra azul acero de Prisma, sin violetas ni cian saturados. El inventario del service worker DEBE conservar exactamente la URL del icono declarada por HTML y manifest, y la caché del shell DEBE incrementarse al cambiar ese recurso.

#### Scenario: Icono sincronizado en la aplicación instalada y el sitio

- DADO que el HTML muestra el favicon y el isotipo del encabezado
- CUANDO el navegador lee el manifest y el service worker
- ENTONCES las cuatro referencias comparten la URL versionada `./assets/prisma.svg?v=brand-20261020-2` y la caché activa usa una versión de shell nueva.

#### Scenario: Cambio del SVG de marca

- DADO que el isotipo SVG cambia de contenido
- CUANDO se prepara una publicación de Prisma
- ENTONCES el manifest, HTML y service worker declaran la URL versionada del nuevo SVG y el service worker renueva su caché para no conservar la marca anterior.


### Requirement: Actualización no disruptiva de clientes abiertos

Prisma DEBE comprobar actualizaciones del service worker sin depender de la caché HTTP del script del worker. Si una actualización cambia el controlador de una página que ya estaba abierta, DEBE informar a la persona y ofrecer una acción explícita para recargar. La aplicación NO DEBE borrar ni modificar datos personales como parte de la actualización, y NO DEBE recargar automáticamente una página con posibles cambios de interfaz sin guardar.

#### Scenario: Actualización mientras la aplicación está abierta

- DADO que Prisma ya está abierto y un nuevo service worker toma el control
- CUANDO cambia el controlador de la página
- ENTONCES Prisma muestra un aviso con una acción «Recargar» y no recarga ni borra datos personales por sí solo

#### Scenario: Primera instalación o navegador sin un controlador previo

- DADO que Prisma se abre por primera vez sin un service worker controlador
- CUANDO el nuevo service worker toma el control inicial
- ENTONCES Prisma no muestra un aviso de actualización innecesario
