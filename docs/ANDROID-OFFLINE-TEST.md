# Verificación manual en Android

Esta comprobación se realiza en el teléfono donde Prisma está instalada. No borra datos ni requiere herramientas de desarrollo.

## Preparación con conexión

1. Abre Prisma desde el icono instalado y deja que se actualice.
2. En Descubrir, espera a que carguen algunos pósteres.
3. Abre un par de fichas para guardar localmente sus datos e imágenes.
4. Comprueba que Biblioteca y Colecciones muestran tus datos.
5. Desde Ajustes, crea una copia de seguridad y guárdala en un lugar seguro.

## Prueba sin conexión

1. Activa el modo avión de Android.
2. Abre Prisma desde su icono, no desde una pestaña nueva del navegador.
3. Confirma que aparece el aviso «Sin conexión».
4. Entra en Personal, Biblioteca y Colecciones; los datos locales deberían seguir disponibles.
5. Vuelve a abrir una ficha que ya habías consultado. Los textos y las imágenes previamente guardados deberían mostrarse cuando estén en caché.
6. En Descubrir, el catálogo guardado debe indicar que se está mostrando información almacenada cuando TMDB no pueda responder.

## Recuperación

1. Desactiva el modo avión.
2. Comprueba que desaparece el aviso de conexión.
3. Descubrir debe volver a consultar TMDB automáticamente.

## Qué no se garantiza sin red

- Las búsquedas nuevas, páginas no visitadas, fichas no guardadas y disponibilidad de streaming pueden necesitar conexión.
- Una imagen que nunca se descargó no aparecerá sin conexión.
- La credencial TMDB permanece local en ese dispositivo; una instalación nueva debe configurarla de nuevo.

Si alguna pantalla que ya habías abierto no se muestra, anota cuál y en qué paso ocurrió. No desinstales Prisma ni borres los datos de la aplicación durante esta prueba.


## Actualización segura de la PWA

1. Cuando haya una versión nueva, Prisma mostrará «Hay una actualización disponible».
2. Si tienes un formulario o diálogo abierto, intenta actualizar: Prisma debe impedir la recarga y pedir que cierres el formulario primero.
3. Guarda o cancela el formulario y ciérralo.
4. Pulsa «Actualizar Prisma». La aplicación debe cargar la nueva versión.
5. Comprueba que Biblioteca, Historial y Colecciones conservan sus datos.
6. Repite la prueba offline después de la actualización.

No borres los datos de la aplicación ni desinstales Prisma durante esta prueba.


## Actualización con dos pestañas abiertas

1. Abre Prisma en dos pestañas del mismo navegador.
2. Deja un formulario de colección o perfil sin guardar en una de ellas.
3. Cuando haya una actualización disponible, instálala desde la otra pestaña.
4. Comprueba que la pestaña que contiene cambios no se recarga automáticamente.
5. Guarda o cancela el formulario y pulsa «Recargar esta pestaña».
6. Comprueba que ambas pestañas pueden continuar en la versión nueva sin perder los datos guardados.
