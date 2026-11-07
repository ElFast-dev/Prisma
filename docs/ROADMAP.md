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
- Cada fase tendrá un nombre descriptivo que exprese la capacidad o experiencia que entrega; se evitarán nombres genéricos que no permitan entender su contenido.
- La primera versión funcional será un hito **MVP 0.x.y**, construido a lo largo de las fases que se definan para cubrir el alcance aprobado en `REQUISITOS.md`, sección 17. La versión **1.0.0** sigue reservada para la primera versión completa del producto.
- El desglose actual de fases y números de versión es preliminar. Antes de cerrar la Fase 0 se redistribuirán las capacidades del MVP, se renombrarán las fases según sus entregables y se ajustarán los hitos SemVer; no se inicia implementación con el reparto antiguo.

## Versionado

Se utilizará Semantic Versioning (SemVer) con **una única secuencia pública y global para toda la aplicación Prisma**.

- Las versiones de la aplicación avanzan de forma continua a través de todas las fases. Las fases agrupan el trabajo y sus entregables; no tienen numeraciones independientes.
- Una fase puede contener varias versiones publicables. Al comenzar la fase siguiente, la numeración continúa desde la última versión entregada: nunca se reinicia ni se repite.
- Antes de completar el producto: **0.x.y**. Una entrega que incorpora funcionalidad nueva o una ampliación aprobada incrementa el número menor (x), por ejemplo, 0.2.0 → 0.3.0. Una corrección que no amplía funcionalidad incrementa el número de parche (y), por ejemplo, 0.3.0 → 0.3.1.
- La versión **1.0.0** será la primera versión completa que cumpla todo el alcance aprobado; no se utilizará para un prototipo ni para una entrega intermedia.
- El MVP es una entrega utilizable anterior a 1.0.0, publicada como versión **0.x.y** cuando todas sus funciones y criterios de aceptación estén completos. Su número exacto se asignará al reorganizar las fases.
- Después de 1.0.0: nuevas funciones compatibles en 1.1.0, 1.2.0; correcciones en 1.0.1, 1.0.2.

Cada versión distribuida se publica en GitHub Releases con tag vX.Y.Z, notas en lenguaje sencillo y APK instalable. El MVP incluye un actualizador dentro de Prisma para consultar y descargar las versiones publicadas; la instalación final respeta el instalador y las autorizaciones de Android. Mientras se desarrolla, los artifacts de GitHub Actions podrán utilizarse para validaciones internas, sin sustituir la publicación de las versiones distribuidas. Mientras se desarrolla, el APK también puede entregarse como artifact de GitHub Actions. Cada entrega debe tener alcance pequeño, criterios de aceptación y comprobaciones propias; compilar por sí solo no basta para darla por terminada.

Los números asignados a los hitos de cada fase son una planificación y podrán ajustarse antes de iniciar esa fase. Cualquier ajuste debe conservar una única secuencia global, creciente y sin reutilizar versiones, además del significado reservado para 1.0.0.

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
- El propietario confirma el alcance de la primera versión funcional (MVP) y distingue sus contenidos del alcance completo reservado para 1.0.0.
- Las fases están renombradas según sus entregables, el reparto funcional y los hitos de versión están actualizados, y los documentos están sincronizados.
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
