# Arquitectura técnica de Prisma

## Principios

1. Local-first: la información personal vive en el dispositivo.
2. Separación de dominio: las pantallas no acceden directamente a IndexedDB ni a TMDB.
3. Resiliencia: una caída de TMDB no debe impedir consultar ni modificar los datos personales.
4. Trazabilidad: los cambios importantes deben ser verificables y reversibles.
5. Portabilidad: exportación e importación versionadas.

## Capas

- Presentación: React, páginas y componentes compartidos.
- Dominio: reglas de películas, biblioteca, visionados, logros y Espectro.
- Persistencia: Dexie sobre IndexedDB.
- Integraciones: cliente TMDB y administración de imágenes.
- Aplicación: navegación, configuración y ciclo de vida PWA.

## Enrutamiento

Se utiliza navegación basada en hash para compatibilidad con GitHub Pages:

- #/personal
- #/discover
- #/spectro
- #/settings
- #/movie/{tmdbId}

## Persistencia

Dexie administra el esquema y sus migraciones. Las imágenes se administrarán por separado en Cache Storage. Los datos personales no se borrarán al limpiar recursos temporales.

## Operaciones de dominio

Registrar un visionado debe ser una transacción que:
1. Valide película, fecha y puntuación.
2. Emita el siguiente número de visionado.
3. Inserte un nuevo Viewing.
4. Actualice la clasificación de Biblioteca a watched.
5. Confirme la operación de manera atómica.

Mover a Pendientes no altera el Historial. La eliminación de visionados solo afecta al registro seleccionado.

## PWA

Vite genera los recursos de producción y el Service Worker. La publicación prevista es GitHub Pages en el subdirectorio /Prisma/.

## Seguridad

No se publicarán credenciales, respaldos, datos personales ni el correo privado de autorización de TMDB. Una credencial introducida en una SPA puede inspeccionarse desde el dispositivo que la utiliza; no debe confundirse con un secreto protegido por servidor.
