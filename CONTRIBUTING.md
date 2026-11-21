# Guía de contribución

Gracias por ayudar a mejorar Prisma. El proyecto prioriza una experiencia cinematográfica local-first, privacidad y una interfaz cuidada tanto en móvil como en pantallas amplias.

## Entorno

- Node.js `>=22.12.0` (la versión requerida también está declarada en `package.json`).
- npm.
- El acceso a TMDB solo es necesario para probar manualmente funciones que consultan el catálogo. Las pruebas automatizadas deben utilizar datos ficticios y mocks.

## Preparar el proyecto

```bash
npm ci
npm run dev
```

## Comprobaciones

Antes de proponer cambios, ejecuta las comprobaciones pertinentes:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:e2e:pwa
```

La CI también ejecuta un smoke test de la versión compilada y Playwright en Chromium, Firefox y WebKit. Si una prueba requiere un dato externo, debe usar una respuesta simulada reproducible y no una credencial personal.

## Criterios de producto

- Mantén Personal, Descubrir y Espectro como los tres destinos principales.
- Conserva el comportamiento local-first. No envíes historial, calificaciones, comentarios, perfil ni preferencias a servicios externos.
- No cambies ni elimines visionados, estados de Biblioteca, colecciones o preferencias al enriquecer metadatos.
- Evita añadir dependencias si una solución pequeña y mantenible ya existe.
- Respeta el sistema de diseño y la norma de redacción de `docs/DESIGN-SYSTEM.md`.
- Los controles deben tener nombres accesibles, foco visible y comportamiento completo con teclado. Los diálogos deben confinar y restaurar el foco.
- Los cambios de base de datos deben incrementar la versión de Dexie y probar la migración. Mantén la compatibilidad de copias de seguridad cuando sea posible.

## Datos y secretos

No incluyas en commits ni pruebas:

- Credenciales o tokens de TMDB.
- Copias de seguridad reales de Prisma.
- Historial, calificaciones, comentarios o datos personales.
- Cookies, sesiones o secretos de CI.

Usa solo fixtures y datos ficticios. Recuerda que una aplicación web que guarda la credencial en el navegador no puede tratarla como un secreto de servidor.

## Pull requests

- Mantén cada cambio enfocado y describe su impacto visible.
- Incluye pruebas para el comportamiento nuevo o modificado.
- Indica las limitaciones conocidas y cualquier paso manual que no haya podido automatizarse.
- No fusiones cambios que no hayan pasado los controles requeridos de CI.

## Licencia

La licencia del código fuente sigue pendiente de decisión por parte de la persona propietaria del repositorio. La visibilidad pública del repositorio no concede por sí sola permisos adicionales de reutilización o distribución.
