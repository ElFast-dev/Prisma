# Roadmap — Prisma

**Estado:** propuesta de orden de trabajo; fase de descubrimiento activa.  
**Revisión:** 0.1.0.  
**Última actualización:** 5 de noviembre de 2026.

## Reglas del roadmap

- Las fases se desarrollan estrictamente en orden.
- No se comienza una fase sin terminar y aprobar la anterior.
- Antes de programar cada fase, se crea una especificación breve con objetivo, alcance, versiones, entregables y criterios de aceptación.
- El propietario aprueba la especificación, no el código.
- No se programa una fase futura, ni se prepara su diseño detallado mientras otra fase está activa.
- Una idea futura se anota aquí como pendiente, sin desarrollarla antes de su turno.
- La última versión de cada fase la cierra.
- Una versión no se da por terminada solo porque compile: debe satisfacer los criterios de esa versión y ser revisada por el propietario.

## Versionado

Se utilizará Semantic Versioning:

- Antes de completar el producto: 0.x.y.
- Incremento visible de funcionalidad: aumenta x, por ejemplo 0.3.0.
- Corrección sin ampliar funcionalidad: aumenta y, por ejemplo 0.3.1.
- La versión **1.0.0** será la primera versión completa que cumpla todo el alcance aprobado.
- Después de 1.0.0: nuevas funciones compatibles en 1.1.0, 1.2.0; correcciones en 1.0.1, 1.0.2.

Cada versión aprobada se marca con tag vX.Y.Z y notas de Release en lenguaje sencillo. Se adjunta APK cuando sea posible. Mientras se desarrolla, el APK también puede entregarse como artifact de GitHub Actions.

La numeración es una propuesta de planificación y podrá ajustarse antes de comenzar una fase, manteniendo el orden y sin redefinir el significado de 1.0.0.

## Fase 0 — Descubrimiento y definición del producto

**Estado:** EN CURSO.  
**Código:** ninguno.  
**Objetivo:** convertir las ideas del propietario en requisitos claros y aprobar la dirección visual antes de programar.

Entregables:
- Requisitos del producto.
- Diseño técnico.
- Roadmap.
- Referencia de autorización TMDB.
- Sistema de diseño visual aprobado.
- Conceptos de pantalla revisados y aprobados individualmente.
- Lista de preguntas abiertas y decisiones confirmadas.

Criterio de cierre:
- El propietario confirma que el alcance de 1.0.0 representa lo que quiere.
- Los documentos están actualizados.
- Se acuerda la primera especificación de implementación.

No se programa durante esta fase.

## Fase 1 — Fundamentos Android y entrega continua

**Estado:** NO INICIADA.  
**Objetivo general:** establecer un proyecto Android nativo compilable, estructura mantenible y CI en GitHub.

Versiones preliminares:
- **0.1.0:** proyecto Android Kotlin/Compose que compila, estructura inicial y prueba de CI.
- **0.2.0:** primera carcasa navegable y primer recorrido visual aprobado, con APK descargable.

Criterio general de cierre: GitHub Actions compila y ejecuta las pruebas base; el propietario puede instalar y abrir el APK; no contiene secretos ni integra aún funciones no aprobadas.

La especificación detallada se escribirá únicamente cuando la Fase 0 termine.

## Fase 2 — Diario personal local

**Estado:** NO INICIADA.  
**Objetivo general:** construir la base local del espectador y los flujos de Historial, Pendientes y Ocultos, comenzando por películas manuales/offline.

Versiones preliminares:
- **0.3.0:** modelo local de películas y alta manual (título requerido, año opcional).
- **0.4.0:** Pendientes e Historial, una portada por película y múltiples visionados.
- **0.5.0:** calificaciones por visionado, calificación previa al registro, estados ocultos/restauración y reglas de listas.

Criterio general de cierre: listas y visionados resisten reinicios y funcionan sin conexión; no hay duplicados de películas en las listas; una repetición conserva fecha y valoración independientes.

No se diseñará ni programará esta fase hasta que llegue su turno y su especificación sea aprobada.

## Fase 3 — TMDB y Descubrir

**Estado:** NO INICIADA.  
**Objetivo general:** integrar el proveedor de metadatos y construir el buscador y Feed.

Versiones preliminares:
- **0.6.0:** configuración segura del token TMDB, búsqueda dinámica y vinculación supervisada de películas manuales.
- **0.7.0:** Feed de tres columnas, paginación infinita, modos Equilibrado/Afinidad/Exploración, filtros y estados de marcapáginas.
- La caché de metadatos e imágenes y el modo offline se verifican antes del cierre de fase.

Criterio general de cierre: el catálogo remoto solo se muestra cuando hay datos reales; las consultas locales siguen disponibles offline; las páginas no duplican películas; una coincidencia manual ambigua exige elección del usuario.

## Fase 4 — Ficha cinematográfica completa

**Estado:** NO INICIADA.  
**Objetivo general:** construir la ficha de película y sus flujos de detalle a partir del diseño visual aprobado.

Versiones preliminares:
- **0.8.0:** cabecera, datos básicos, listas y registro de visionados/fechas.
- **0.9.0:** puntuaciones externas, calificar, sinopsis, tráiler, reparto/equipo, colecciones, películas relacionadas y proveedores de streaming por región, según datos disponibles.

Criterio general de cierre: todos los estados de ficha son coherentes; no se muestran valores inventados ni datos inexistentes; fecha de visionado corresponde al inicio; la UI respeta la configuración de spoilers y región.

## Fase 5 — Estadísticas y Espectro

**Estado:** NO INICIADA.  
**Objetivo general:** convertir el diario local en conocimiento útil sobre los gustos del usuario.

Versiones preliminares:
- **0.10.0:** estadísticas temporales, géneros, directores, duración, países, actividad y evolución de calificaciones.
- **0.11.0:** Espectro local, modos de afinidad/exploración, recomendaciones explicables y evidencias de cada conclusión.

Criterio general de cierre: cada cifra puede rastrearse hasta datos del usuario; cada recomendación explica sus señales; no se envía el historial ni el perfil al exterior; se informa cuando falta muestra suficiente.

## Fase 6 — Copias, robustez y versión completa

**Estado:** NO INICIADA.  
**Objetivo general:** completar copias cifradas, seguridad, pruebas integrales, rendimiento y aceptación.

Versiones preliminares:
- **0.12.0:** exportación/restauración cifrada, migraciones y validación del formato de copia.
- **1.0.0:** cierre de alcance, regresión completa, revisión de privacidad, verificación offline, APK final y documentación de instalación.

Criterio de cierre: todo el alcance aprobado de Requisitos está implementado y validado; el propietario instala el APK, prueba los recorridos críticos y aprueba la fase.

## Después de 1.0.0

Prisma seguirá creciendo. No hay funciones post-1.0.0 aprobadas todavía. Las ideas se registrarán aquí cuando aparezcan, se consultarán al propietario y solo pasarán al alcance después de su aprobación.

## Registro de cambios de fase

| Fase | Estado | Aprobación del propietario | Versión de cierre |
|---|---|---|---|
| 0. Descubrimiento | En curso | Pendiente | No aplica |
| 1. Fundamentos | No iniciada | Pendiente | 0.2.0 |
| 2. Diario local | No iniciada | Pendiente | 0.5.0 |
| 3. TMDB y Descubrir | No iniciada | Pendiente | 0.7.0 |
| 4. Ficha completa | No iniciada | Pendiente | 0.9.0 |
| 5. Estadísticas y Espectro | No iniciada | Pendiente | 0.11.0 |
| 6. Copias y 1.0.0 | No iniciada | Pendiente | 1.0.0 |
