# Política de seguridad

## Alcance

Prisma es una aplicación web/PWA local-first. La biblioteca, el historial, las calificaciones, los comentarios y las preferencias se guardan en el navegador mediante IndexedDB. La credencial de TMDB se guarda en el almacenamiento local del navegador y puede ser inspeccionada por alguien que tenga acceso a ese navegador.

La aplicación no tiene un backend propio ni recibe copias de seguridad personales. No adjuntes credenciales, respaldos, datos de biblioteca ni capturas con información privada al comunicar un problema.

## Versiones

La referencia para verificar una corrección es la versión más reciente de la rama `main`. No se ofrece una política de soporte de largo plazo para versiones antiguas o forks.

## Cómo comunicar una vulnerabilidad

1. Comprueba si la pestaña **Security** del repositorio ofrece la opción **Report a vulnerability** y utilízala para enviar un aviso privado.
2. Incluye el commit o versión afectada, navegador y sistema operativo, pasos mínimos para reproducir el problema, impacto observado y cualquier condición necesaria.
3. Elimina del informe tokens de TMDB, copias JSON de Prisma, datos personales, cookies y otros secretos.
4. No publiques detalles explotables, credenciales ni una prueba de concepto en un issue, discusión o pull request público.

Si el repositorio no ofrece la opción de reporte privado, contacta con la persona mantenedora mediante un canal privado disponible en su perfil de GitHub. No publiques detalles técnicos sensibles en un canal público.

## Qué ayuda a evaluar un informe

- La superficie afectada y si requiere interacción de la persona usuaria.
- El impacto sobre datos locales, credenciales, disponibilidad o integridad.
- Una reproducción pequeña con datos ficticios.
- La versión del navegador, sistema operativo y commit de Prisma.

Los avisos de dependencias de desarrollo o construcción deben identificar el paquete, versión, ruta transitiva y advisory upstream. Un resultado de `npm audit` por sí solo no demuestra que exista una vía explotable en la aplicación publicada.

## Coordinación

La persona mantenedora revisará los informes y coordinará una corrección o una aclaración del alcance cuando sea necesario. No se establece un plazo garantizado de respuesta ni un programa de recompensas.

Las correcciones de seguridad deben preservar la privacidad local-first y no incluir datos personales en commits, logs, artefactos de CI ni pruebas.
