# Requisitos del producto — Prisma

**Estado:** borrador vivo de descubrimiento.  
**Revisión:** 0.1.0.  
**Última actualización:** 5 de noviembre de 2026.  
**Propietario y aprobador del producto:** ElFast-dev.  
**Alcance:** decisiones expresadas y confirmadas en la conversación; no equivale a aprobar una fase de implementación.

## 1. Visión

Prisma es un espacio cinematográfico personal y privado para registrar la vida del usuario como espectador. Debe recordar qué películas ha visto y cuántas veces, conservar las fechas y calificaciones de cada visionado, ayudar a decidir qué ver y mostrar cómo evolucionan sus gustos.

No debe sentirse como otro catálogo ni como una red social. Debe ser cinematográfico, ordenado, honesto, libre de spoilers cuando el usuario active esa protección y útil sin conexión.

El algoritmo personal de recomendaciones se llama **Espectro**. Aprende de forma automática a partir de las acciones del usuario y funciona localmente.

## 2. Público, plataforma y alcance

- Aplicación nativa para Android.
- Un espacio personal por instalación, sin cuenta obligatoria de Prisma.
- El alcance inicial incluye **películas exclusivamente**.
- Series y episodios quedan fuera del alcance de la versión 1.0.0.
- El repositorio de código es público y la distribución prevista es gratuita y no comercial, de acuerdo con la autorización particular de TMDB comunicada por el propietario.
- Cada instalación conserva sus datos localmente. El traslado a otro teléfono se hace mediante copia cifrada manual, no por sincronización de nube.

## 3. Principios de producto y privacidad

1. La base local del teléfono es la fuente principal de los datos personales.
2. El historial, las fechas de visionado, las puntuaciones, las listas, las estadísticas y el perfil de aprendizaje de Espectro no salen del dispositivo.
3. Prisma no requiere una cuenta propia ni un backend propio.
4. Las búsquedas y solicitudes de metadatos a TMDB necesitan conexión y transmiten a TMDB la consulta o los identificadores solicitados. Esto no autoriza a enviar el historial personal.
5. No se inventan datos ausentes. Si falta una duración, no se muestra «-1 min». Si faltan puntuaciones, se utiliza el indicador visual previsto. Si no hay proveedores, reparto, tráiler o enlaces válidos, no se finge que existen.
6. La información remota se guarda localmente para que lo ya descargado siga disponible sin conexión.
7. La falta de conexión o una caída temporal de TMDB no debe impedir consultar o modificar el diario personal.
8. No se añaden funciones, SDK, anuncios, analítica o servicios externos por iniciativa propia sin acordarlo con el propietario.

## 4. Navegación principal

Al abrir Prisma, la sección predeterminada es **Descubrir**.

La navegación principal es una píldora flotante, separada de los bordes inferiores de la pantalla, con dos secciones:

- **Personal**
- **Descubrir**

### 4.1 Personal

Al pulsar Personal, se abre una pantalla principal (centro de navegación) con cinco accesos visibles a sus subsecciones. No entra directamente a Historial.
- La pantalla no repite un encabezado de marca o sección como «PRISMA» o «Personal», ni utiliza un subtítulo o eslogan como «Tu historia como espectador». La navegación inferior ya comunica la sección activa; el contenido comienza directamente con los accesos.
- Las tarjetas de Historial, Pendientes y Ocultos muestran discretamente la cantidad de películas que contienen. Historial cuenta películas únicas, no el número total de visionados.
- «Gestionar listas» muestra la cantidad de listas personalizadas.
- Estadísticas no necesita un contador de elementos en esta pantalla.

Contiene estas subsecciones:

- **Historial:** películas vistas.
- **Pendientes:** películas que el usuario quiere ver.
- **Ocultos:** películas ocultadas deliberadamente.
- **Estadísticas:** evolución y análisis de gustos.
- **Gestionar listas:** sección independiente para crear y administrar listas cinematográficas personalizadas. No es una forma de gestionar Historial o Pendientes; estas listas principales siguen siendo independientes.

### 4.2 Descubrir

Contiene el buscador y el Feed de películas. El buscador va arriba, junto a un acceso a filtros y otro a Ajustes. El Feed aparece debajo.

## 5. Descubrir: Feed

### 5.1 Modos de contenido

El Feed ofrece tres modos:

- **Equilibrado:** modo predeterminado al abrir la aplicación.
- **Afinidad:** prioriza películas afines a los gustos conocidos por Espectro.
- **Exploración:** busca ampliar los horizontes del usuario con películas menos parecidas a sus patrones habituales.

El modo vuelve automáticamente a Equilibrado cuando Prisma ha permanecido fuera de primer plano durante **cinco minutos o más**. Si vuelve antes de cinco minutos, conserva el modo temporal que estaba seleccionado.

### 5.2 Diseño del Feed

- Diseño predeterminado: cuadrícula de **tres columnas** con pósteres verticales.
- En Ajustes se podrá elegir un segundo diseño: mosaico variado de tres columnas, combinando pósteres verticales con imágenes horizontales de doble o triple ancho entre filas.
- Los dos diseños deben respetar los márgenes y el sistema visual que se apruebe.
- El Feed utiliza desplazamiento infinito: carga más resultados al acercarse al final, sin botón de paginación.
- Se deben evitar duplicados entre páginas y preservar el orden coherente del modo y los filtros.
- Sin conexión se muestra solamente el contenido disponible localmente; no se simulan películas nuevas.

### 5.3 Marcadores de las portadas

Las películas que pertenezcan a las listas llevan un icono de **marcapáginas**:

- Azul: película registrada en Historial (vista).
- Gris: película en Pendientes.

El icono también se usa en las portadas de «También podría gustarte» dentro de la ficha.

### 5.4 Filtros

Se pueden combinar varios filtros a la vez:

- Géneros.
- Año de estreno.
- País de producción.
- Duración.
- Idioma original.
- Puntuación de TMDB.

Los filtros de Descubrir también admiten combinación AND/OR cuando tenga sentido para las condiciones elegidas; no se fuerza un operador donde no resulte aplicable.

También existe un filtro para ocultar del Feed las películas que tengan marcadores:

- Ocultar Vista.
- Ocultar Pendiente.
- Ocultar ambas.

Este filtro solo cambia lo que aparece en Descubrir. No modifica las listas ni elimina datos.

## 6. Buscador

- Está en la parte superior de Descubrir.
- Muestra resultados mientras el usuario escribe, sin exigir que pulse Enter.
- Los resultados muestran póster, título y año de estreno cuando se conozca.
- El buscador incluye películas locales de Historial, Pendientes y Ocultos, además de resultados de TMDB.
- Los resultados identifican su estado mediante el marcapáginas o un indicador de película oculta.
- Las películas ocultas se pueden encontrar mediante búsqueda, aunque no aparezcan en el Feed.
- Sin conexión, la búsqueda funciona sobre el contenido local guardado.

## 7. Ficha cinematográfica

La ficha se organiza de arriba hacia abajo y evita tarjetas pesadas salvo donde se hayan pedido expresamente.

### 7.1 Cabecera

- Imagen horizontal a todo lo ancho, con degradado oscuro inferior.
- Flecha de volver en círculo semitransparente arriba a la izquierda.
- Menú de tres puntos en círculo semitransparente arriba a la derecha.
- Título grande blanco, alineado a la izquierda sobre la imagen.
- Si no hay imagen, claqueta grande gris sobre fondo gris oscuro.

### 7.2 Datos básicos

Una línea con fecha de estreno (día, mes abreviado y año), código de país entre paréntesis, duración con icono de reloj y géneros; los elementos se separan con barras verticales.

Debajo aparece el estado de producción, cuando exista: «Estrenada», «En producción» o «Post-producción».

No se muestra «-1 min» ni ningún valor inválido. Si la duración es desconocida, se omite o se marca como no disponible de acuerdo con el diseño que se apruebe.

### 7.3 Acciones principales y listas

Para una película no oculta:

- Botón ancho de contorno fino «AGREGAR A HISTORIAL».
- A su derecha, acción de texto gris «AGREGAR A PENDIENTES».
- El menú de tres puntos ofrece acciones pequeñas con icono y texto en mayúsculas: «GESTIONAR LISTAS» y «OCULTAR».
- «GESTIONAR LISTAS» se refiere a las listas personalizadas definidas en Personal; no agrega ni quita la película de Historial o Pendientes.
- Al pulsar «GESTIONAR LISTAS» se abre una ventana con todas las listas personalizadas y una casilla por lista. Las casillas reflejan las listas a las que ya pertenece la película; el usuario puede marcar o desmarcar varias para agregarla o quitarla de esas listas en una sola acción.
- La relación exacta entre esa acción de la ficha y la sección de Personal (por ejemplo, abrir un selector de listas personalizadas) queda pendiente de concretar.
- La ubicación y el comportamiento exactos de «Colecciones» se detallan en la sección de preguntas abiertas.

Estados del botón:

- **Pendiente:** botón casi a todo el ancho, marcapáginas y texto «AÑADIDO A PENDIENTES», con check a la derecha.
- **En Historial:** contorno y texto azul, marcapáginas relleno y, debajo, la fecha y hora del visionado más reciente en azul pequeño.
- **Oculta:** desaparecen «AGREGAR A HISTORIAL» y «AGREGAR A PENDIENTES»; aparece un único botón «MOSTRAR DE NUEVO».

### 7.4 Registrar un visionado

Al pulsar «AGREGAR A HISTORIAL» aparece una ventana con cuatro opciones:

1. **Ahora:** registra el momento actual del teléfono.
2. **Día de estreno:** registra la fecha oficial de estreno de la película.
3. **Seleccionar fecha:** abre un calendario y permite elegir fecha y hora de inicio.
4. **Ajustar al inicio:** pensado para registrar la película después de verla. Calcula una hora estimada de inicio restando la duración conocida a la hora actual de registro y muestra el resultado antes de confirmarlo. No abre otro calendario. Si la duración es desconocida, no inventa un resultado ni presenta un cálculo falso.

La fecha del visionado corresponde al comienzo de la película, nunca al momento en que termina. Por ejemplo, si comienza el 5 de noviembre a las 11:00 p. m. y termina el 6 de noviembre a la 1:00 a. m., el registro pertenece al 5 de noviembre.

Se conserva la hora local del teléfono. Para «Ajustar al inicio», el texto de vista previa muestra una fecha y hora concretas antes de guardar. El resultado se identifica como estimación porque depende de la duración registrada por TMDB.

«Día de estreno» utiliza una fecha de calendario; no se debe inventar una hora de visionado para esa opción.

### 7.5 Visionados repetidos

- Cada visionado es un registro independiente.
- Cada uno conserva su propia fecha, hora (si se conoce) y calificación.
- En Historial aparece una sola portada por película, con contador de visionados.
- Al entrar en la película se puede consultar la lista completa de visionados y puntuaciones.
- Una repetición no sobrescribe fechas ni puntuaciones anteriores.

### 7.6 Calificar

- Se puede calificar una película aunque todavía no esté en Historial ni en Pendientes.
- La ventana muestra diez estrellas en fila, el número de la estrella seleccionada en el centro y un botón «Calificar» para confirmar.
- Después de confirmar, se muestra la puntuación, por ejemplo «7 / 10».
- Si se califica antes de registrar el visionado, la puntuación queda como calificación personal provisional. Cuando se agrega el siguiente visionado, se asocia a ese nuevo registro.
- Si hay varios visionados ya registrados, al pulsar «Calificar» se pregunta a cuál de ellos se quiere asignar la nueva puntuación. No se elige uno ni se sobrescriben otros automáticamente.
- La ficha muestra como puntuación personal la del visionado más reciente. Si no existe ningún visionado, puede mostrar la calificación personal no asociada.

La ficha incluye cuatro columnas de puntuaciones externas, con el número grande y el nombre de la fuente debajo. Las cuatro fuentes elegidas por el propietario son:

1. **TMDB**
2. **IMDb**
3. **Rotten Tomatoes**
4. **Metacritic**

Si no existe una puntuación, no hay un dato verificable o no existe una vía de acceso autorizada, se muestra el icono de enlace previsto en lugar de inventar un número. La selección de estas fuentes define el objetivo de producto y visual; no constituye por sí sola una licencia ni garantiza acceso técnico a sus datos. No se permite obtener las puntuaciones mediante scraping o extracción no autorizada. Cada fuente adicional a TMDB requiere verificar sus condiciones de acceso, licencia, atribución y posibilidad de distribución pública antes de integrarla.

### 7.7 Dónde verla

- Muestra tarjetas horizontales deslizables con logo, nombre de plataforma y modalidad: suscripción, gratis, compra o alquiler.
- Solo aparece cuando existen datos.
- La vista inicial contempla **todas las regiones**, agrupando los proveedores por país.
- En Ajustes se puede seleccionar una región concreta.
- Al pulsar una tarjeta, abre el enlace externo de la película cuando TMDB proporcione uno válido.
- La ausencia de datos no se presenta como ausencia universal de disponibilidad; se comunica como falta de datos de la fuente.

### 7.8 Sinopsis y acciones rápidas

- La sinopsis ocupa dos o tres líneas y se corta con puntos suspensivos si es larga.
- Acciones rápidas en píldoras deslizables: Calificar, Tráiler y Enlaces.
- Si el usuario ya calificó, la acción muestra, por ejemplo, «7 / 10».
- Si no hay tráiler, la acción aparece atenuada.

### 7.9 Reparto y equipo

- Carrusel de fotografías verticales, con el nombre sobre la foto en la esquina inferior izquierda.
- Debajo, tres columnas de texto pequeño y clicable: Dirección, Escritores y Música.
- No se muestran personas ni datos inventados si TMDB carece de información.

### 7.10 Colecciones y películas relacionadas

- Si la película pertenece a una saga/colección, se muestra el nombre y una descripción breve.
- La opción «Colecciones» está asociada a la zona del menú de tres puntos; el detalle exacto de apertura está pendiente de definición visual.
- «También podría gustarte» muestra un carrusel de pósteres que continúa visualmente más allá del borde de pantalla para invitar a deslizar.
- Los pósteres relacionados usan el marcapáginas azul para Vista y gris para Pendiente.

## 8. Ocultos y restauración

- «OCULTAR» retira la película de Descubrir y de las recomendaciones habituales de Espectro.
- Ocultar no elimina historial, visionados, calificaciones ni metadatos guardados.
- Las películas ocultas se consultan exclusivamente en Personal → Ocultos.
- En su ficha, las acciones de agregar a Historial/Pendientes se sustituyen por «MOSTRAR DE NUEVO».
- Al restaurarla, vuelve a Descubrir y recupera el estado anterior: Vista, Pendiente o sin marcador.
- El filtro de ocultar marcadores Vista/Pendiente no equivale a ocultar una película de forma permanente.

## 9. Personal: listas

### Historial
Una portada por película, con contador de visionados. La ficha permite consultar cada fecha y calificación.

### Pendientes
Una portada por película, sin duplicados. Al registrar un visionado, la película pasa automáticamente a Historial y sale de Pendientes.

### Ocultos
Una portada por película oculta. Desde la ficha se puede «MOSTRAR DE NUEVO» y recuperar el estado anterior.

### Gestionar listas
Sección independiente de Personal para crear y administrar listas cinematográficas personalizadas. Estas listas no sustituyen ni se confunden con Historial o Pendientes.

- Eliminar una lista elimina solo esa lista y sus asociaciones con películas; no elimina las películas, visionados, calificaciones ni la pertenencia de esas películas a otras listas personalizadas.
- Antes de eliminar una lista, Prisma muestra una confirmación con el nombre de la lista y las acciones «CANCELAR» y «ELIMINAR».
- Cada lista tiene un **nombre obligatorio**.
- Cada lista puede tener una **descripción opcional**.
- Cada lista tiene un **color identificativo propio**, elegido por el usuario al crearla.
- El color se elige de una **paleta predeterminada y curada por Prisma**; no habrá selector libre de cualquier color.
- Los tonos exactos de la paleta se definirán y mostrarán dentro del sistema de diseño visual para aprobación del propietario antes de cerrar esa decisión.
- Cada lista puede marcarse mediante la acción **«FIJAR»**; no se utilizará una categoría o acción llamada «Favoritas».
- La lista fijada conserva ese estado hasta que el usuario la desfije.
- Las listas fijadas aparecen automáticamente al principio de la sección «Gestionar listas», antes de las no fijadas. Esta prioridad no modifica el orden de las películas dentro de cada lista.
- El usuario puede reordenar manualmente las listas arrastrándolas. Se conserva un orden independiente dentro del grupo de listas fijadas y dentro del grupo de listas no fijadas; ninguna lista no fijada puede adelantarse a una fijada.
- El color se muestra de forma discreta junto al nombre y en detalles de la lista; no altera los colores originales de los pósteres del collage.
- La portada de cada lista es un collage automático compuesto por los pósteres de las películas que pertenecen a esa lista; no se elige una imagen de portada manualmente.
- El collage se actualiza cuando cambia el conjunto de películas de la lista y utiliza únicamente imágenes disponibles localmente o descargadas legítimamente de TMDB.
- Una misma película puede pertenecer simultáneamente a varias listas personalizadas.
- Añadir o quitar una película de una lista personalizada no altera su pertenencia a otras listas, ni cambia Historial, Pendientes u Ocultos.
- El usuario puede ordenar manualmente las películas de cada lista arrastrando sus portadas.
- Además del orden manual, puede aplicar un orden temporal por título, año, duración, fecha de estreno o calificación. Este orden temporal no reemplaza ni borra el orden manual guardado.
- Cada lista personalizada tiene filtros propios e independientes. Cambiar los filtros de una lista no modifica los filtros ni el contenido de las demás listas ni los del Feed de Descubrir.
- Cada lista personalizada incluye como base los filtros de Descubrir: géneros, año de estreno, país de producción, duración, idioma original y puntuación de TMDB.
- Las listas podrán incorporar muchos filtros adicionales. La selección exacta se definirá con el propietario progresivamente; no se asumirán filtros no aprobados.
- Los filtros pueden combinarse entre sí y su configuración queda separada por lista.
- Cuando la combinación sea lógica, el usuario puede elegir entre operadores **AND** (deben cumplirse todas las condiciones) y **OR** (puede cumplirse cualquiera de las condiciones). La interfaz no ofrecerá combinaciones que no tengan sentido para los filtros seleccionados.
- **AND** es el operador predeterminado al abrir los filtros; el usuario puede cambiarlo a **OR**.
- Los nombres y descripciones son definidos por el usuario.
- La estructura detallada de una lista y las acciones disponibles se concretarán con el propietario.

## 10. Estadísticas y comprensión de gustos

Estadísticas es uno de los pilares de Prisma. Debe incluir al menos:

- Películas vistas y total de visionados.
- Tiempo dedicado al cine.
- Géneros más vistos.
- Directores más frecuentes.
- Evolución de calificaciones.
- Actividad por meses y años.
- Preferencias por duración, país, idioma y otras características disponibles.

El usuario quiere «muchas más» estadísticas para conocerse como espectador. El conjunto detallado se concretará al diseñar esa sección.

Las observaciones deben explicar por qué se llega a cada conclusión y mostrar películas, puntuaciones y datos que la sustentan. Prisma no presenta hipótesis como hechos ni inventa conclusiones. Si la muestra es insuficiente, lo dice.

## 11. Espectro: recomendaciones inteligentes

Espectro es el algoritmo propio de Prisma.

- Aprende automáticamente del Historial, visionados repetidos, calificaciones, Pendientes, películas ocultadas y otros datos locales de uso que el propietario apruebe.
- El aprendizaje y el perfil permanecen en el dispositivo.
- Recomienda películas y explica brevemente por qué las recomienda.
- Cada explicación debe estar respaldada por datos reales, como películas, géneros, directores o puntuaciones.
- Las películas ocultas no aparecen en las recomendaciones habituales.
- Los modos Afinidad, Equilibrado y Exploración controlan el equilibrio entre similitud y descubrimiento.
- No se enviará el perfil personal a servicios externos ni se usará un modelo remoto para aprender del historial.

## 12. Películas añadidas manualmente y enriquecimiento con TMDB

- Se puede crear una película manualmente incluso sin conexión.
- El único dato obligatorio al crearla es el título.
- El año de estreno es opcional.
- Cuando haya internet, Prisma buscará completar su información con TMDB.
- Si hay varias coincidencias, se muestran opciones con datos para distinguirlas (por ejemplo, póster y año); el usuario elige.
- No se asocia automáticamente una coincidencia dudosa.
- El enriquecimiento nunca borra listas, visionados ni calificaciones personales.

## 13. TMDB y contenido externo

- TMDB es la fuente principal prevista para metadatos e imágenes.
- El usuario podrá introducir su API Read Access Token de TMDB en Ajustes.
- La clave se guarda cifrada en el teléfono; no se incluye en el repositorio, los APK, los registros de Actions ni las copias de seguridad.
- La app debe gestionar errores, límites y caídas temporales de TMDB.
- Los metadatos y las imágenes que ya se descargaron se mantienen disponibles sin conexión, dentro de la capacidad de almacenamiento real del dispositivo.
- La autorización particular comunicada por el usuario incluye metadatos, imágenes y datos de disponibilidad de streaming procedentes de JustWatch vía TMDB, sin atribución adicional. Se conserva por separado en el documento de licencia.

## 14. Ajustes

Ajustes incluirá, como mínimo:

- API Read Access Token personal de TMDB.
- Diseño del Feed: cuadrícula de tres columnas o mosaico variado.
- Idioma de Prisma: se inicia con el idioma del teléfono y el usuario puede cambiarlo.
- Región de disponibilidad de «Dónde verla»: inicial «Todas las regiones»; se puede restringir a una región.
- «Ocultar spoilers»: desactivado por defecto. Al activarlo, oculta sinopsis, tráileres y otros contenidos que puedan revelar sorpresas.

El idioma de la interfaz y la región de disponibilidad son preferencias independientes.

## 15. Spoilers

- «Ocultar spoilers» empieza desactivado.
- Cuando se activa, no se muestran sinopsis, tráileres ni otros contenidos considerados propensos a revelar sorpresas.
- La protección debe ser conservadora y no prometer que el texto externo está libre de spoilers si no puede comprobarse.
- El usuario puede cambiar la opción en Ajustes.

## 16. Copias de seguridad y restauración

- Prisma permite exportar manualmente un archivo de copia de seguridad cifrado con una contraseña elegida por el usuario.
- Se puede restaurar en otro teléfono introduciendo esa contraseña.
- La copia incluye Historial, todos los visionados, fechas y puntuaciones, Pendientes, Ocultos, preferencias y datos aprendidos por Espectro.
- No se utiliza una nube propia ni sincronización automática.
- La contraseña no se guarda junto al archivo ni se transmite a Prisma.
- Si se pierde la contraseña, la copia no se puede descifrar.
- Las credenciales/API tokens no se incluyen en la copia.
- El archivo debe tener formato versionado para permitir futuras migraciones.

## 17. Alcance previsto de la versión 1.0.0

La versión 1.0.0 será la primera versión completa que cumpla todos los requisitos aprobados en este documento. No es un prototipo ni la última versión de Prisma.

La 1.0.0 debe cubrir: navegación Personal/Descubrir; Historial, Pendientes, Ocultos y listas personalizadas; fichas; visionados repetidos y calificación; buscador y Feed; filtros y modos; TMDB y caché local; región e idioma; modo de spoilers; Estadísticas; Espectro local y explicable; alta manual y enriquecimiento; copia cifrada y restauración; y pruebas de funcionamiento offline.

La lista se considera viva mientras el propietario siga precisando el producto. No se debe reducir el alcance de 1.0.0 sin su aprobación explícita.

## 18. Decisiones confirmadas y cuestiones abiertas

### Confirmado
Las reglas descritas en las secciones anteriores fueron expresadas o confirmadas por el propietario.

### Pendiente de concretar, sin bloquear el registro actual
- Detalle de listas personalizadas: crear, renombrar, eliminar, añadir/quitar películas y persistencia del orden manual; se definirá con el propietario antes de esa parte del desarrollo.
- Catálogo completo de filtros adicionales para listas personalizadas y comportamiento del orden manual cuando hay filtros activos.
- Reglas de unicidad de nombres y orden inicial de las listas personalizadas.
- Relación exacta entre la acción «GESTIONAR LISTAS» de la ficha y la sección de listas personalizadas.
- Presentación exacta de Colecciones desde el menú de tres puntos.
- Fuente y criterios para los tráileres y enlaces rápidos.
- Detalle de las estadísticas adicionales y visualizaciones.
- Detalle del comportamiento del mosaico y los estados vacíos mediante diseño visual.
- Qué fecha de estreno se toma cuando TMDB ofrece varios estrenos por país.
- Cómo se muestra una fecha de estreno elegida como fecha de visionado cuando no existe hora real.
- Idiomas concretos que se traducirán en la primera versión (el idioma inicial sí está definido).
- Versión mínima de Android e identificador del paquete, decisiones técnicas que se fijarán antes de implementar.

Una cuestión abierta no autoriza al equipo a inventar una regla; se debe resolver en la fase correspondiente y actualizar este documento.
