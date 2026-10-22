# Tareas

- [x] Añadir marcadores independientes de créditos y palabras clave al normalizador TMDB.
- [x] Enriquecer registros antiguos que solo tengan metadatos básicos recientes.
- [x] Respetar la vigencia de la caché para evitar peticiones repetidas.
- [x] Preservar marcadores y datos personales al normalizar y actualizar colecciones.
- [x] Añadir pruebas de regresión sobre registros antiguos, datos completos y datos caducados.
- [x] Actualizar versiones de módulos, PWA y pruebas de caché.
- [x] Documentar el requisito en OpenSpec.
- [x] Ejecutar CI y pruebas visuales Playwright; corregir cualquier regresión.
- [x] Fusionar y confirmar el despliegue tras la aprobación.

## Evidencia de integración, regresión y despliegue

- PR #75 y los cambios de metadatos heredados (#74) están fusionados y presentes en el SHA probado `d434226476db32d19a5d0f6fdb82ab35632aad7e`.
- Calidad/SDD satisfactoria: [run 39839611430](https://github.com/ElFast-dev/Prisma/actions/runs/39839611430).
- Playwright escritorio/móvil satisfactorio sobre el mismo SHA: [run 39839651891](https://github.com/ElFast-dev/Prisma/actions/runs/39839651891).
- GitHub Pages publicó exactamente `d434226476db32d19a5d0f6fdb82ab35632aad7e`: [run 39839898057](https://github.com/ElFast-dev/Prisma/actions/runs/39839898057).
- La suite cubre la compuerta del despliegue aprobado, los marcadores de créditos/keywords y el enriquecimiento de registros antiguos sin alterar datos personales.
