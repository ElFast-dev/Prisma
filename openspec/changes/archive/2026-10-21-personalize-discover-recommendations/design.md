# Diseño: modos de mezcla en recomendaciones

## Interfaz
Dentro de «Recomendadas para ti», debajo del encabezado, un grupo de tres controles compactos: Equilibrado, Más afines y Más variedad. El control activo declara `aria-pressed`; el grupo tiene nombre accesible. Una descripción breve comunica el efecto del modo elegido. Se usan chips existentes y tokens actuales de tema negro/azul discreto.

## Estado y privacidad
La preferencia se almacena como `prisma:recommendation-mode` en localStorage, separada de los datos de perfil guardados en IndexedDB. Los valores aceptados son `balanced`, `affinity` y `variety`. Si el valor no existe, está corrupto o storage no está disponible, se usa Equilibrado sin interrumpir la aplicación.

## Ranking
- **Equilibrado:** conserva la clasificación base por nota estimada y características nuevas, con un límite suave de dos recomendaciones del mismo género principal cuando el catálogo tenga suficientes candidatos.
- **Más afines:** ordena por nota estimada y después por número de señales coincidentes; no penaliza la concentración de género.
- **Más variedad:** selecciona de forma iterativa y determinista usando la nota estimada, las características nuevas y una bonificación por géneros poco representados con penalización moderada de repetición. La diversidad nunca sustituye de forma desproporcionada a la afinidad prevista.

Los candidatos se deduplican antes de puntuarse y se excluyen mediante la función de pertenencia a la colección, junto con los elementos que solo representan historial.

## Compatibilidad
Sin dependencias nuevas ni cambios en el perfil. Se versionan los módulos modificados y las hojas CSS del shell; se actualizan validadores y pruebas de caché.

## Verificación final
Las tres ejecuciones terminaron con éxito sobre `4a4f534f33b28f73889be532e8750f7b0013697f`:
- [Calidad SDD y JavaScript](https://github.com/ElFast-dev/Prisma/actions/runs/39525632203) — success.
- [Validación Prisma](https://github.com/ElFast-dev/Prisma/actions/runs/39525632151) — success.
- [Playwright: capturas, selección y persistencia](https://github.com/ElFast-dev/Prisma/actions/runs/39525632116) — success.
