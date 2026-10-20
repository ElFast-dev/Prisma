# Propuesta: adoptar SDD en Prisma

## Estado

Aceptado tras revisión técnica el 2026-10-20 y archivado. Se comprobaron la estructura documental, el alcance, la trazabilidad SDD y los límites de cobertura; la especificación distingue el comportamiento observado de lo todavía no probado.

## Motivación

Prisma ya tiene comportamiento, datos personales y despliegue activo. Los cambios hechos directamente desde una conversación pueden olvidar decisiones previas, modificar áreas no relacionadas o dar por probada una función que solo se ha descrito. Hace falta un ciclo versionado que conecte requisitos, diseño, tareas, código y evidencia.

## Alcance

- Documentar el propósito y los límites del producto a partir del repositorio actual.
- Registrar arquitectura y modelo de datos observados.
- Crear especificaciones de referencia para catálogo, colecciones, importación/exportación, recomendaciones, privacidad, TMDB, PWA y UI.
- Adoptar un ciclo de cambios compatible con revisión desde GitHub móvil.
- Añadir una validación automática de estructura SDD y sintaxis JavaScript.

## Fuera de alcance

- No rediseñar la interfaz en este cambio.
- No reescribir app.js ni alterar almacenamiento, importación, TMDB o algoritmo.
- No incorporar dependencias npm o requerir una CLI en Android.
- No usar un historial personal real como fixture.
- No afirmar que la validación inicial cubre todas las funciones del navegador.

## Criterios de aceptación

1. Existe contexto versionado del producto, arquitectura, modelo de datos y decisión de metodología.
2. Las especificaciones principales tienen requisitos y escenarios comprobables.
3. El expediente de este cambio explica el nuevo flujo SDD y mantiene visibles las tareas pendientes.
4. GitHub Actions comprueba los artefactos requeridos y la sintaxis de app.js sin credenciales ni datos privados.
5. La aplicación no tiene cambios funcionales en este expediente.
6. La convergencia, las pruebas automatizadas y cualquier limitación quedan reportadas antes de archivar el cambio.

## Impacto y riesgo

El riesgo funcional directo es bajo porque no se modifica el código de ejecución de la aplicación. Existe el riesgo de que las especificaciones describan una expectativa más fuerte que el comportamiento real; por eso el proceso distinguirá los comportamientos inspeccionados, los requisitos de protección y las limitaciones conocidas.
