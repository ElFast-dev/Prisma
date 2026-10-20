# Propuesta: sincronizar el isotipo y los iconos de Prisma

## Estado

Propuesta definida antes de modificar los recursos de marca; implementación en curso en esta rama.

## Motivación

La nueva interfaz ya emplea una paleta oscura con violeta suave y cian como detalle secundario, pero el favicon, el isotipo del encabezado y el icono de la PWA conservan el degradado azul anterior. Esta diferencia debilita la identidad visual justo en los lugares donde el usuario reconoce la aplicación fuera del contenido de películas.

## Alcance

- Mantener la geometría reconocible del isotipo y cambiar solo su paleta a violeta/cian sobre una superficie oscura.
- Usar la misma URL SVG versionada en el favicon, el logo del encabezado, el manifest y el inventario del service worker.
- Incrementar la versión del manifest y la caché del shell para retirar copias anteriores.
- Añadir una prueba automática que valide paleta, referencias y coherencia de caché.

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
6. El expediente se mantiene activo hasta verificar CI, Pages y UI publicada.
