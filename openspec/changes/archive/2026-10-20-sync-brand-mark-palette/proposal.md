# Propuesta: sincronizar el isotipo y los iconos de Prisma

## Estado

Cerrada y archivada el 2026-10-20 tras la fusión del PR #14 y la verificación de la publicación en GitHub Pages.

## Motivación

La nueva interfaz ya emplea una paleta oscura con violeta suave y cian como detalle secundario, pero el favicon, el isotipo del encabezado y el icono de la PWA conservan el degradado azul anterior. Esta diferencia debilita la identidad visual justo en los lugares donde el usuario reconoce la aplicación fuera del contenido de películas.

## Alcance

- Mantener la geometría reconocible del isotipo y cambiar solo su paleta a violeta/cian sobre una superficie oscura.
- Usar la misma URL SVG versionada en el favicon, el logo del encabezado, el manifest y el inventario del service worker.
- Incrementar la versión del manifest y la caché del shell para retirar copias anteriores.
- Añadir una prueba automática que valide paleta, referencias y coherencia de caché.
- Comprobar el isotipo publicado mediante los flujos automatizados de escritorio y móvil.

## Fuera de alcance

- No cambiar la forma del logotipo, el layout, la lógica de películas ni los datos personales.
- No introducir dependencias, imágenes remotas ni un paso de compilación.
- No crear una segunda hoja de estilos de marca.

## Criterios de aceptación

1. El SVG usa violeta suave y cian secundario sobre una base oscura coherente con la interfaz.
2. Favicon, logo visible y manifest apuntan a la misma URL versionada del SVG.
3. `index.html`, `manifest.webmanifest` y `sw.js` declaran la misma versión de recursos.
4. El service worker cambia de versión de shell para limpiar la caché anterior.
5. Una prueba automatizada verifica colores, geometría y referencias exactas; CI la ejecuta.
6. Playwright verifica las referencias publicadas al icono en escritorio y móvil.
7. El expediente se mantiene activo hasta verificar CI, Pages y UI publicada.


## Evidencia de cierre

- PR fusionado: [#14 — alinear el isotipo con el sistema visual](https://github.com/ElFast-dev/Prisma/pull/14).
- Commit publicado: [401a019](https://github.com/ElFast-dev/Prisma/commit/401a019219e0e1479b1ecc83fc3b4a7e8854a423).
- SDD y calidad estática: [workflow 39517055755](https://github.com/ElFast-dev/Prisma/actions/runs/39517055755), correcto.
- Validación de Prisma: [workflow 39517055850](https://github.com/ElFast-dev/Prisma/actions/runs/39517055850), correcto.
- GitHub Pages: [workflow 39517055749](https://github.com/ElFast-dev/Prisma/actions/runs/39517055749), despliegue correcto.
- Playwright contra la web publicada: [workflow 39517091542](https://github.com/ElFast-dev/Prisma/actions/runs/39517091542), correcto en escritorio y móvil con la referencia versionada del favicon y del logo del encabezado.
