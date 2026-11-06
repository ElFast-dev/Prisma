# Diseño técnico — Prisma

**Estado:** diseño técnico inicial; se actualizará con la investigación previa a cada fase.  
**Revisión:** 0.1.0.  
**Última actualización:** 5 de noviembre de 2026.  
**No implica autorización para programar.**

## 1. Objetivo técnico

Construir una aplicación Android nativa, mantenible, comprobable y offline-first. El dispositivo será la fuente de verdad de los datos personales. TMDB será una fuente remota de metadatos, imágenes y disponibilidad, nunca el dueño del historial del usuario.

Las decisiones se basan primero en las recomendaciones oficiales de Android. Las versiones exactas de Gradle, Kotlin, Android Gradle Plugin, SDK y bibliotecas se comprobarán y fijarán al preparar la especificación de la fase que vaya a usarlas; no se copiarán números de versión antiguos.

## 2. Plataforma y lenguaje

- **Lenguaje:** Kotlin.
- **Interfaz:** Jetpack Compose y Material 3.
- **Tipografía de interfaz:** familia **Inter**, seleccionada como identidad tipográfica global de Prisma. El tamaño de referencia para el texto normal de lectura continua es **16 px**, para el texto secundario es **14 px** y para los títulos de sección es **22 px**; los pesos aprobados son **400, 500 y 600**. Estos valores no sustituyen los tamaños específicos de componentes ya aprobados. Inter se incorporará como recurso local dentro de la aplicación, no como fuente descargada en tiempo de ejecución, para mantener la presentación disponible sin conexión y consistente entre dispositivos. El texto normal de **16 px** utiliza peso **regular (400)**, altura de línea de **24 px** y espaciado entre caracteres (*letter spacing*) de **0 px adicionales**; el texto secundario de **14 px** utiliza peso **regular (400)** y altura de línea de **20 px**; los títulos de sección de **22 px** utilizan peso **medio (500)** y altura de línea de **28 px**; las alturas y los pesos de los demás niveles, la versión concreta y los archivos de fuente se fijarán en la especificación técnica de implementación, conservando la licencia SIL OFL 1.1.
- **Navegación:** una sola Activity; se evaluará Navigation 3 si su versión estable y su integración cumplen los requisitos al iniciar la fase de navegación.
- **Concurrencia:** Kotlin Coroutines y Flow.
- **Estado de interfaz:** ViewModel, StateFlow y flujo unidireccional de datos.
- **Inyección de dependencias:** Hilt, salvo que la verificación de compatibilidad vigente muestre una razón técnica para escoger otra alternativa.
- **Nivel mínimo de Android:** pendiente de fijar antes de crear el proyecto, buscando compatibilidad amplia sin sacrificar seguridad y bibliotecas actuales.
- **SDK objetivo:** la versión estable más reciente compatible disponible al comenzar la fase de implementación.

Jetpack Compose es el toolkit moderno recomendado por Android para aplicaciones nuevas. La arquitectura se organizará por capas con repositorios y una única fuente de verdad.

## 3. Arquitectura de la aplicación

Capas:

1. **Presentación (UI):** pantallas Compose, componentes visuales, navegación y ViewModels. No consulta directamente Room ni HTTP.
2. **Dominio:** reglas de negocio y casos de uso cuando la complejidad/reutilización lo justifique; aquí se ubicarán las reglas de visionados, estados de lista, puntuaciones, Espectro y estadísticas.
3. **Datos:** repositorios que coordinan la base local, caché de imágenes, preferencias y fuente de red TMDB.

Reglas:

- La UI observa estado; no contiene reglas de negocio complejas.
- La UI y el dominio no llaman directamente a TMDB.
- Los repositorios coordinan las fuentes y actualizan la fuente local.
- La información personal se lee siempre desde la base local.
- Los cambios importantes se expresan como casos de uso transaccionales para evitar estados contradictorios.
- Coroutines/Flow y actualización de estado unidireccional facilitan pruebas y coherencia.

## 4. Persistencia local

### 4.1 Room

Room será la base principal para datos estructurados y relaciones. Se usará para:

- Películas y metadatos de TMDB.
- Películas creadas manualmente y su proceso de vinculación con TMDB.
- Historial de películas y registros independientes de visionado.
- Fechas/horas, origen de la fecha y calificaciones de cada visionado.
- Calificación personal todavía no asociada a un visionado.
- Listas Historial, Pendientes y Ocultos y estado anterior a ocultar.
- Listas personalizadas, pertenencia de películas, orden de películas, orden de listas, preferencias de filtros, color identificativo y estado fijado/desfijado. El orden de listas se conserva de forma independiente para fijadas y no fijadas; la prioridad de las fijadas no cambia el orden interno de sus películas.
- Datos locales de estadísticas y señales de Espectro, cuando se materialicen.
- Estado/paginación de resultados que deban sobrevivir a reinicios.

Las relaciones y restricciones de base de datos deben impedir duplicados de una misma película en una lista y preservar múltiples visionados de la misma película.

### 4.2 DataStore

Jetpack DataStore guardará preferencias pequeñas y cambios de configuración, por ejemplo:

- Diseño de Feed elegido.
- Instante necesario para aplicar el reinicio a Equilibrado después de cinco minutos fuera de primer plano.
- Idioma seleccionado o herencia del idioma del dispositivo.
- Región de disponibilidad.
- Preferencia de ocultar spoilers.
- Configuración no sensible.

Room se reserva para datos estructurados; DataStore no sustituirá la base relacional.

### 4.3 Imágenes y caché

Las imágenes descargadas se guardarán en almacenamiento privado de la app mediante una biblioteca de carga/caché compatible con Compose (se verificará la versión estable, preferentemente Coil 3). Room guardará rutas, referencias y metadatos, no los bytes grandes.

La licencia particular informada permite caché ilimitada de contenido e imágenes de TMDB, pero el almacenamiento físico del teléfono no es ilimitado. Prisma debe manejar falta de espacio, no corromper datos personales y ofrecer una gestión clara de caché. Nunca se borrarán visionados o calificaciones para liberar espacio automáticamente.

## 5. Red y TMDB

- Cliente HTTP encapsulado en una fuente de datos remota y repositorio.
- Autenticación TMDB mediante cabecera Authorization: Bearer con el API Read Access Token personal.
- HTTPS obligatorio.
- La clave se introduce en Ajustes.
- La clave nunca se incluye en el código, el repositorio, variables de Actions, APK/AAB, logs, informes de fallos o copia de seguridad.
- Toda petición que no sea necesaria para el comportamiento local se evita.
- Las búsquedas envían el texto consultado a TMDB; no se envía el historial ni el perfil Espectro.
- Se manejarán errores HTTP, respuestas incompletas, límites de consultas, desconexión y cambios de esquema.
- Nunca se completan campos con suposiciones. Los valores ausentes se representan como no disponibles u omitidos.
- Los resultados se persisten localmente antes de presentarse como datos disponibles offline.

### Proceso de búsqueda de una película

1. Consultar primero resultados locales para respuesta inmediata.
2. Si hay conexión y token válido, ejecutar la búsqueda remota con retardo/debounce para evitar una petición por cada pulsación.
3. Combinar resultados con identificador TMDB estable y eliminar duplicados.
4. Persistir metadatos antes de exponerlos como contenido guardado.
5. Si se trata de una película manual con varias coincidencias, pedir elección humana y no asociar una coincidencia dudosa.

### Filtros y ordenación

- Los criterios de filtro se representarán como condiciones combinables y evaluables de forma determinista.
- La capa de dominio admitirá operadores AND y OR cuando los criterios seleccionados permitan esa combinación lógica.
- El operador inicial será AND; la preferencia de cambiar a OR podrá mantenerse mientras se edita el conjunto de filtros, sin alterar los datos guardados.
- El estado de filtros de Descubrir y el de cada lista personalizada se almacenará por separado; una lista no heredará ni modificará el estado de otra.
- El orden manual de una lista se conservará como orden propio. Los criterios de ordenación temporal (título, año, duración, fecha de estreno o calificación) se aplicarán como una vista/orden alternativo y no sobrescribirán las posiciones manuales.
- Los filtros y la ordenación deben tener resultados coherentes sin conexión sobre los metadatos disponibles localmente. Si falta un dato requerido, no se inventará un valor para forzar el orden o el filtro.
- La sintaxis exacta para combinar grupos de condiciones y el orden predeterminado se definirá en la especificación de la fase correspondiente, después de validar los casos de uso reales.

### Feed infinito

Se empleará paginación real de la fuente y persistencia de claves/estado. Se evaluará Paging 3 con RemoteMediator y Room para que la UI lea del origen local y la paginación remota alimente esa base. Debe haber claves estables y deduplicación por identificador TMDB.

Sin red, el Feed solo presenta páginas y películas ya guardadas; no inventa resultados nuevos ni promete un Feed ilimitado offline.

### Trabajo en segundo plano

WorkManager gestionará tareas aplazables que deban persistir al salir/cerrar la app, como reintentar enriquecimiento de películas manuales cuando vuelva la conectividad. Se usarán restricciones de red, reintentos con backoff y trabajo idempotente. No se dependerá de una tarea inmediata que Android pueda interrumpir.

## 5.1 Fuentes de puntuaciones externas

La interfaz aprobada reserva cuatro espacios para TMDB, IMDb, Rotten Tomatoes y Metacritic. La integración se hará con estas reglas:

- TMDB puede proporcionar su propia puntuación de usuarios a través de su API oficial.
- Para IMDb, la documentación vigente indica acceso a su API mediante AWS Data Exchange, con solicitud/suscripción, credenciales AWS y condiciones de uso propias. La alternativa de datasets tiene restricciones y requisitos de atribución específicos.
- Rotten Tomatoes exige tramitar una solicitud de uso/licencia para integrar sus datos en una aplicación; sus pautas públicas indican atribución y enlaces al contenido. La autorización particular de TMDB no sustituye el permiso de Rotten Tomatoes.
- Metacritic no se tratará como una API pública gratuita. La ruta de acceso documentada encontrada es una oferta licenciada mediante proveedor asociado, con aprobación y suscripción comercial. Se verificará el contrato aplicable antes de usarla.
- No se utilizará scraping, extracción automatizada de páginas ni servicios intermediarios no autorizados para obtener puntuaciones.
- La puntuación solo se muestra cuando existe un origen legítimo, una correspondencia inequívoca de película y permiso para el uso y distribución previstos por Prisma.
- Si una fuente no se puede integrar legal y técnicamente, su espacio mostrará el icono de enlace de la interfaz o se abrirá su página pública si existe una URL válida; nunca se rellenará con una estimación.

La autorización particular recibida de TMDB cubre el contenido entregado por TMDB, incluida su disponibilidad de streaming de JustWatch según lo comunicado por el propietario. No se extiende a los derechos de IMDb, Rotten Tomatoes, Metacritic ni a proveedores ajenos.

## 6. Seguridad y privacidad

### 6.1 Token de TMDB

- Generar una clave AES mediante Android Keystore.
- Cifrar el token local antes de persistirlo.
- Guardar solo el texto cifrado en DataStore o almacenamiento privado.
- Descifrarlo solo en memoria al preparar una petición.
- Evitar logs y trazas que puedan imprimir cabeceras o tokens.
- No exportar el token en el backup.
- Si la instalación/Keystore se pierde, el usuario tendrá que introducir de nuevo su token.

Keystore protege la clave de cifrado y limita su extracción; no se debe prometer protección absoluta frente a un dispositivo rooteado, instrumentación del proceso o código malicioso ejecutado con los permisos de la propia app.

### 6.2 Datos personales

- Historial, puntuaciones, listas, estadísticas y perfil Espectro permanecen localmente.
- No hay backend de Prisma, cuenta, sincronización automática ni perfil social en el alcance aprobado.
- La app solo se comunica con servicios externos cuando el usuario solicita información cinematográfica o cuando un trabajo autorizado actualiza metadatos.
- No se transmite la actividad personal de visionado como telemetría.

### 6.3 Copias cifradas

Exportación/importación manual de un archivo versionado:

- Derivar una clave de cifrado desde la contraseña introducida, usando un KDF con sal aleatoria y parámetros almacenados en el encabezado versionado.
- Cifrar/autenticar con AES-256-GCM y nonce aleatorio.
- No guardar la contraseña ni enviarla a ningún servicio.
- Rechazar archivos manipulados, contraseñas incorrectas y versiones no compatibles sin sobrescribir los datos existentes.
- Validar y probar el proceso de restauración de extremo a extremo.
- No incluir credenciales de TMDB.
- La contraseña olvidada no se puede recuperar.

Los parámetros concretos del KDF, del encabezado y del formato de archivo se fijarán en la fase que implemente copias, después de revisar las recomendaciones de seguridad vigentes.

## 7. Fechas de visionado

- El dato principal será el instante de comienzo, no la hora en que termina la película.
- Se conservarán el instante y la zona horaria local utilizada al registrar, para no desplazar la fecha al cambiar la zona horaria del teléfono.
- «Ahora» usa el instante actual.
- «Seleccionar fecha» conserva fecha y hora elegidas.
- «Día de estreno» conserva una fecha de calendario sin inventar una hora de visionado.
- «Ajustar al inicio» estima el comienzo restando el runtime conocido a la hora actual de registro; la vista previa debe decir que es una estimación.
- Runtime desconocido: no hay cálculo ni fecha inventada.
- El paso a medianoche no altera el día de inicio.

## 8. Espectro

Motor de recomendación local y explicable:

- Lee señales desde Room: visionados, repeticiones, calificaciones, pendientes y ocultaciones.
- Usa metadatos cinematográficos ya guardados para obtener similitudes y patrones.
- No envía datos ni genera solicitudes remotas con el historial personal.
- Devuelve una recomendación y una explicación estructurada con las señales concretas que la sustentan.
- Debe poder explicar falta de datos/confianza y evitar conclusiones categóricas con muestras pequeñas.
- La fórmula inicial y la evaluación de relevancia se diseñarán en la fase específica de Espectro; no se adelanta aquí una ponderación arbitraria.

## 9. Pruebas y calidad

Pruebas previstas:

- Unitarias de reglas de listas, visionados, cálculos de fecha, puntuaciones, ocultación y restauración.
- Pruebas de repositorios y base de datos Room, incluidas migraciones.
- Pruebas de sincronización de metadatos y respuestas ausentes/error usando un cliente de red falso.
- Pruebas de estado offline y recuperación de conexión.
- Pruebas de interfaz de Compose para flujos críticos.
- Verificación de que tokens y datos privados no aparezcan en logs o artefactos.
- Pruebas de rendimiento de desplazamiento, paginación e inicio antes de 1.0.0.

## 10. Integración continua y entregas con GitHub

### Identificación de versiones Android

- `versionName` mostrará la versión pública SemVer de Prisma y seguirá la secuencia global definida en el Roadmap (por ejemplo, `0.1.0`, `0.2.0`, `0.2.1`). No se reinicia al cambiar de fase.
- `versionCode` será el entero interno que Android utiliza para ordenar actualizaciones. Debe aumentar en cada APK distribuido como actualización y nunca puede reutilizarse ni reiniciarse entre fases.
- La regla concreta para asignar y reservar `versionCode` se fijará en la especificación de la Fase 1, antes de generar el primer APK instalable.

GitHub Actions será el sistema de CI:

- Al abrir/actualizar Pull Requests y al integrar cambios en la rama principal: compilar y ejecutar pruebas automatizadas.
- Al completar una versión: crear tag y Release con notas breves en español.
- Cuando el entorno y la fase lo permitan: adjuntar APK instalable a la Release o publicar el APK como artifact de workflow mientras se valida.
- Nunca guardar secretos en workflows o repositorio.
- No ejecutar ni vigilar procesos de GitHub Actions después de dejarlos en marcha; informar al propietario qué se inició y esperar a que indique que terminó.

La configuración y los permisos exactos de Actions se verificarán antes de implementarlos.

## 11. Rendimiento y accesibilidad

- Usar claves estables y reutilización en listas/paginación.
- Evitar cargar todas las imágenes del Feed en memoria.
- Probar desplazamiento y carga de imágenes en dispositivos reales o emuladores.
- Considerar Baseline Profiles cuando existan recorridos de uso medibles.
- Respetar escalado de texto, contraste, descripciones accesibles y objetivos táctiles.

## 12. Decisiones técnicas revisables

Las decisiones técnicas son responsabilidad del desarrollador y pueden evolucionar si aparece una alternativa claramente mejor. Un cambio que afecte requisitos, privacidad, UX o alcance aprobado requiere actualizar los documentos y avisar al propietario antes de incorporarlo.

No se escribe código hasta que la especificación de la fase activa esté aprobada.
