# Prisma

**Diario cinematográfico personal para Android.** Prisma conserva la historia de cada espectador en el propio teléfono, ayuda a descubrir películas y aprende los gustos de forma local mediante su algoritmo **Espectro**.

## Estado actual

- Proyecto en fase de descubrimiento y definición del producto.
- Repositorio recién inicializado; no había código previo.
- No hay ninguna fase de programación autorizada ni iniciada.
- Las decisiones confirmadas están en [Requisitos del producto](docs/PRODUCTO/REQUISITOS.md).
- Las propuestas y las preguntas abiertas se identifican por separado; una sugerencia del asistente no se considera aprobada sin confirmación expresa.
- Antes de programar una fase, se crea su especificación breve, se presenta al propietario y se espera su aprobación explícita.

## Documentos principales

- [Requisitos del producto](docs/PRODUCTO/REQUISITOS.md)
- [Diseño técnico](docs/TECNICO/DISENO_TECNICO.md)
- [Roadmap](docs/ROADMAP.md)
- [Autorización particular de TMDB comunicada para Prisma](docs/LICENCIAS/TMDB_PRISMA.md)
- [Estado y decisiones visuales](docs/DISENO/ESTADO_VISUAL.md)
- [Referencias técnicas oficiales](docs/REFERENCIAS_TECNICAS.md)

## Reglas de trabajo

1. Todo el código y la documentación viven en este repositorio.
2. Al comenzar cada conversación de trabajo, leer primero este README y los documentos principales; ampliar la lectura según la fase activa.
3. Avanzar las fases estrictamente en el orden del roadmap.
4. No preparar ni programar trabajo de fases posteriores mientras una fase anterior siga activa.
5. Antes de cada fase, redactar una especificación con alcance, versiones, entregables y criterios de aceptación. El propietario aprueba esa página, no el código.
6. No programar hasta recibir esa aprobación.
7. Cada versión debe ser un incremento pequeño y comprobable. Registrar cada versión en GitHub con una explicación sencilla y, cuando sea viable, un APK instalable.
8. Mantener requisitos y decisiones visuales sincronizados con lo acordado. Si algo cambia, actualizar los documentos y explicarlo.
9. Mostrar conceptos visuales en la conversación; no usar imágenes generadas por IA para sustituir los diseños. No cerrar una pantalla sin aprobación.
10. No añadir funciones sugeridas hasta que el propietario las apruebe.

## Principios no negociables

- Películas solamente en el alcance inicial; series y episodios quedan fuera.
- Historial, calificaciones, estadísticas y aprendizaje de Espectro permanecen en el dispositivo.
- No se necesita una cuenta de Prisma ni un servidor de Prisma.
- Debe funcionar sin conexión para las funciones basadas en datos ya guardados.
- No inventar información, puntuaciones, disponibilidad ni enlaces.
- No mostrar valores técnicos inválidos como duración de -1 minuto.
- Las búsquedas y solicitudes de información a TMDB salen del dispositivo; el historial personal no se envía.
- Las copias de seguridad son exportaciones manuales cifradas; Prisma no sincroniza datos personales mediante una nube propia.

## Versionado

Se usa SemVer. Antes de completar el producto, las versiones serán 0.x.y. La versión 1.0.0 será la primera que cumpla todo el alcance aprobado. Después se continuará con 1.1.0, 1.2.0, etc. para mejoras, y 1.0.1, 1.0.2, etc. para correcciones.
