# Prisma

Aplicación cinematográfica personal, local-first y gratuita, diseñada como PWA para Android.

Prisma se organiza en tres espacios:

- **Personal:** biblioteca, historial, colecciones, perfil y logros.
- **Descubrir:** exploración cinematográfica mediante un feed de carátulas.
- **Espectro:** análisis local de preferencias y recomendaciones propias.

## Estado del proyecto

El repositorio inicia con la estructura técnica y la primera interfaz navegable. Las funcionalidades cinematográficas y la persistencia se incorporarán progresivamente y se documentarán antes de su implementación.

## Tecnologías previstas

- React
- TypeScript
- Vite
- IndexedDB mediante Dexie
- TMDB API
- Service Worker / PWA
- Vitest y Playwright

## Desarrollo local

Requisitos: Node.js LTS y npm.

```bash
npm install
npm run dev
```

Para generar la versión de producción:

```bash
npm run build
npm run preview
```

## GitHub Pages

El proyecto está configurado para publicarse en:

`https://elfast-dev.github.io/Prisma/`

El despliegue se realizará mediante GitHub Actions cuando se active GitHub Pages con la opción **GitHub Actions** como fuente de publicación.

## Privacidad y credenciales

- Los datos personales se almacenarán localmente en el dispositivo.
- No se debe guardar una clave TMDB en el código, en variables públicas de compilación ni en Git.
- Cada instalación que utilice TMDB deberá configurar su propia credencial.
- No se deben subir al repositorio archivos de copias de seguridad, datos personales ni el correo privado de autorización de TMDB.

## Documentación

La documentación técnica y funcional se encuentra en `docs/`.

## Licencia

La licencia del código fuente está pendiente de decisión. La autorización específica de uso de TMDB facilitada para Prisma es independiente de la licencia del código de este repositorio.
