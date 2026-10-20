# Delta: icono de marca y PWA

## ADDED Requirements

### Requirement: Identidad visual coherente del icono PWA

El favicon, el isotipo visible en el encabezado y el icono declarado en el manifest DEBEN utilizar el mismo SVG versionado y la misma paleta violeta/cian de Prisma. El inventario del service worker DEBE conservar exactamente la URL del icono declarada por HTML y manifest, y la caché del shell DEBE incrementarse al cambiar ese recurso.

#### Scenario: Icono sincronizado en la aplicación instalada y el sitio

- DADO que el HTML muestra el favicon y el isotipo del encabezado
- CUANDO el navegador lee el manifest y el service worker
- ENTONCES las cuatro referencias comparten la URL versionada `./assets/prisma.svg?v=brand-20261020-1` y la caché activa usa una versión de shell nueva.

#### Scenario: Cambio del SVG de marca

- DADO que el isotipo SVG cambia de contenido
- CUANDO se prepara una publicación de Prisma
- ENTONCES el manifest, HTML y service worker declaran la URL versionada del nuevo SVG y el service worker renueva su caché para no conservar la marca anterior.
