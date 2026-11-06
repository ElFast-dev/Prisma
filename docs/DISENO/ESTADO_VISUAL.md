# Estado visual — Prisma

**Estado:** dirección visual en descubrimiento. No hay sistema de diseño ni pantallas aprobadas todavía.  
**Última actualización:** 5 de noviembre de 2026.

## Reglas de diseño

## Regla permanente para crear conceptos visuales

Cada vez que se presenten conceptos visuales para Prisma, deben ser propuestas trabajadas y de calidad de presentación, no simples bocetos repetidos o variaciones superficiales.

Criterios obligatorios:
- Revisar primero este documento y los requisitos de producto para respetar todas las decisiones aprobadas y no reabrirlas accidentalmente.
- Mostrar la pantalla o componente dentro de su contexto real de uso, con composición completa y jerarquía visual clara.
- Cuando se comparen alternativas, mantener constantes los elementos ya aprobados y cambiar únicamente la variable que se está evaluando, salvo que la comparación solicite explícitamente explorar direcciones distintas.
- Hacer que las alternativas sean visualmente distinguibles y que cada una tenga una intención de diseño reconocible; evitar duplicados que solo cambien una cifra sin que la diferencia se perciba.
- Cuidar proporciones, alineaciones, ritmo de espaciado, márgenes, tipografía, iconografía, estados y consistencia entre componentes.
- Utilizar datos de ejemplo claramente identificados como ficticios; nunca presentarlos como datos reales del usuario.
- Explicar brevemente qué diferencia a cada concepto y qué efecto produce en la experiencia.
- Si el propietario pide «mejores diseños conceptuales», rehacer la propuesta con una mejora visible de calidad, detalle y composición; no responder repitiendo esencialmente el mismo boceto.
- Los conceptos se construyen directamente en la conversación con componentes visuales; no se sustituyen por imágenes generadas por IA.
- No declarar una pantalla aprobada hasta que el propietario confirme expresamente el diseño completo.

Esta regla aplica a todos los conceptos futuros de Prisma, no solo a la pantalla Personal.

- El propietario dirige la decisión visual.
- Los conceptos de pantalla se muestran en la conversación, no se sustituyen por imágenes generadas con IA.
- El sistema de diseño es la referencia principal para color, tipografía, botones, espaciado, iconos y estilo.
- Antes de diseñar una pantalla nueva, se consulta el sistema de diseño; si falta un componente, se propone y aprueba antes de usarlo.
- Cada pantalla se presenta para aprobación antes de cerrarla.
- Si se modifica una decisión aprobada, se actualiza el mismo artefacto de referencia, no se crean duplicados.
- Las decisiones aprobadas también se guardan en este repositorio para conservar memoria entre conversaciones.

## Requisitos visuales ya acordados

### Paleta de colores — Dark Mode (confirmada)

- **Fondo principal:** `#131313` (RGB 19, 19, 19).
- **Superficies elevadas** — tarjetas, secciones, contenedores y listas: `#222222` (RGB 34, 34, 34).
- **Acento principal** — botones, iconos en estado activo, destacados y calificaciones: `#5B9BD5` (RGB 91, 155, 213).

La paleta establece estos tres roles; no implica que el sistema visual completo ni ninguna pantalla estén aprobados. Los tonos de texto, neutros, bordes, estados adicionales y una eventual paleta para tema claro siguen pendientes.

### Personal: pantalla principal (concepto A seleccionado, todavía en borrador)

- Al tocar Personal desde la píldora inferior, se abre un centro de navegación con cinco accesos visibles.
- Los accesos son Historial, Pendientes, Ocultos, Estadísticas y Gestionar listas.
- No se abre Historial directamente.
- La distribución queda aprobada como estructura: Historial, Pendientes, Ocultos y Estadísticas son cuatro tarjetas grandes en una cuadrícula de dos columnas; Gestionar listas es un acceso horizontal de ancho completo debajo.
- Márgenes laterales exteriores de Personal: **16 px** a izquierda y derecha, medidos desde los bordes de la pantalla hasta los extremos de las tarjetas y de la fila «Gestionar listas».
- Margen superior de Personal: **16 px** desde el final del área segura superior hasta la primera fila de tarjetas.
- La separación vertical entre la segunda fila de tarjetas (Ocultos y Estadísticas) y el acceso horizontal «Gestionar listas» es de **12 px**.
- Presentación de «Gestionar listas»: **concepto B seleccionado**. Se representa como una fila horizontal de ancho completo, con icono de **20 px y color `#D0D0D0`**, igual que los iconos inactivos de las tarjetas principales, con **12 px de separación horizontal respecto al nombre**, nombre, contador discreto y un **chevron fino y discreto de 16 px y color `#888888`** alineado al extremo derecho. El nombre «Gestionar listas» utiliza un tamaño de **14 px**, peso **medio (500)** y color **`#F0F0F0`** (blanco suave), igual que los nombres de las tarjetas principales. La fila tiene una **altura de 60 px**. La fila tiene un **margen interior horizontal de 16 px** entre sus bordes y el contenido. El contador y el chevron mantienen una **separación horizontal de 12 px**. El contador de «Gestionar listas» utiliza peso **regular (400)**. El icono, el nombre, el contador y el chevron quedan **centrados verticalmente** respecto a la fila. Mantiene la superficie `#222222`, el contorno `#353535` de 1 px y el radio de 14 px. Estado de pulsación seleccionado: **iluminación sutil**, con superficie `#2B2B2B` y contorno `#454545` de 1 px; el cambio es transitorio mientras se pulsa y no utiliza el azul de acento.
- Concepto elegido para las cuatro tarjetas: **A, iconos grandes y minimalistas**. Se descarta para esta pantalla la alternativa de collages de pósteres.
- Los iconos son los elementos gráficos principales de las cuatro tarjetas; los contadores se mantienen pequeños y discretos.
- Estilo de iconografía: **A, lineal y minimalista**, sin placas ni fondos geométricos detrás del símbolo.
- Grosor del trazo: **A, fino**. Debe conservar buena legibilidad y no volverse excesivamente delicado.
- Tamaño: **A, 32 px, grande y equilibrado**. Los iconos deben destacar con claridad dentro de las tarjetas, manteniendo espacio libre suficiente y sin competir con el nombre. Se descarta el tamaño extra grande de 40 px.
- Color de iconos: **A, monocromático**. Los cuatro iconos utilizarán un mismo tono en estado inactivo; no habrá un color distinto por sección. El propietario confirmó **`#D0D0D0`** (gris claro) para los iconos inactivos. Los iconos en estado activo podrán utilizar el acento principal **`#5B9BD5`**.
- Composición interna aprobada: icono grande arriba a la izquierda, contador discreto arriba a la derecha cuando corresponda y nombre de la sección abajo.
- Separación vertical entre el icono y el nombre de las tarjetas: **concepto A, 20 px**, equilibrada y compacta.
- Tamaño de los contadores de las tarjetas de Personal: **concepto A, 12 px**, pequeños y discretos, sin cápsula ni fondo.
- Separación vertical entre icono y nombre: **concepto A, aproximadamente 20 px**, para mantener una relación compacta y clara.
- Tipografía de los nombres de las secciones: **concepto A, discreta, 16 px y peso medio**. Es una referencia inicial pendiente de validación dentro del sistema tipográfico completo.
- Color de los nombres de las cuatro tarjetas de Personal: **concepto A, `#F0F0F0`** (blanco suave). La elección aplica a esos nombres; no cierra la paleta tipográfica general.
- Alineación de los nombres de las cuatro tarjetas: **concepto A, alineados a la izquierda**, respetando el margen interior de 16 px.
- Proporción de las cuatro tarjetas: **A, cuadradas con relación de aspecto 1:1**. Se descarta la alternativa ligeramente vertical.
- Tratamiento de superficie de las cuatro tarjetas: superficie elevada sólida `#222222`, según la paleta Dark Mode confirmada. Esta decisión sustituye el fondo transparente elegido anteriormente; se conserva el contorno fino de 1 px.
- Grosor del contorno de las tarjetas de Personal: **A, delicado, 1 px**. Se descarta la alternativa de 1.5 px.
- Color del contorno de las tarjetas de Personal: **A, `#353535`**, sutil y discreto. Este valor corresponde a estas tarjetas; no define automáticamente todos los bordes de la aplicación.
- Radio de las esquinas: **A, redondeo sutil de 14 px**. Se descarta el redondeo amplio de 26 px.
- Separación entre las cuatro tarjetas: **A, compacta, 12 px**. Se descarta la alternativa amplia de 20 px.
- Espacio interior de las cuatro tarjetas: **A, compacto, 16 px** entre el contenido y el contorno.
- La pantalla comienza directamente con los cinco accesos: no debe mostrar «PRISMA», un título repetido «Personal» ni un eslogan/subtítulo como «Tu historia como espectador».
- Historial, Pendientes y Ocultos muestran un contador discreto de películas; Historial cuenta películas únicas, no visionados.
- Estilo de los contadores: **A, número integrado sin fondo ni cápsula**, con tipografía discreta y alineación en la esquina superior derecha.
- Color de los contadores de Historial, Pendientes, Ocultos y Gestionar listas: **A, `#D0D0D0`** (gris claro), uniforme en los cuatro accesos.
- Tamaño de los contadores: **A, 12 px**, pequeño y discreto.
- Gestionar listas muestra un contador discreto de listas personalizadas. Estadísticas no muestra contador en el centro de navegación.
- Las tarjetas mantienen el título del acceso y el contador cuando corresponda; no necesitan frases descriptivas largas.
- La aprobación cubre la distribución y estas decisiones parciales de las tarjetas, no el aspecto final: la pantalla sigue en borrador hasta definir y aprobar el sistema visual completo, tipografía general, demás tonos de texto, neutros, espaciado y detalles de los componentes.
- Siguen pendientes la familia tipográfica general, los demás tonos de texto y neutros, colores de estados adicionales, dimensiones definitivas, valores exactos del grosor de trazo, reglas de tema claro y demás componentes del sistema visual. Ya están definidos los tres roles cromáticos base de Dark Mode y los colores específicos de iconos inactivos, contorno y nombres de las tarjetas de Personal.

### Navegación y Descubrir

- Descubrir es la sección inicial.
- Barra/búsqueda en la parte superior, con accesos a filtros y Ajustes.
- Feed debajo del buscador.
- Píldora flotante inferior, separada de los bordes, con Personal y Descubrir.
- Altura de la píldora flotante inferior: **64 px**.
- Ancho de la píldora flotante inferior: **240 px** (concepto A, formato compacto).
- Distribución horizontal de Personal y Descubrir dentro de la píldora: **concepto A seleccionado**, dos espacios iguales de **120 px** cada uno; cada sección centra su conjunto de icono y nombre dentro de su mitad.
- Forma exterior de la píldora flotante inferior: **concepto A seleccionado**, cápsula completa con radio de **32 px**.
- Grosor del contorno exterior de la cápsula de navegación inferior: **1 px**, color **`#353535`**.
- Tratamiento visual de la navegación inferior: **concepto B seleccionado**. La píldora exterior conserva la superficie **`#222222`** y un contorno de **1 px** en color **`#353535`**. La sección activa se distingue solo por el icono y el texto en azul de acento **`#5B9BD5`**, colocados directamente sobre la superficie común, sin cápsula ni fondo interior adicional. La sección inactiva utiliza icono y texto en gris **`#BDBDBD`**. El concepto define este tratamiento de selección, no aprueba todavía el diseño completo de la navegación ni de la pantalla.
- Disposición interna de cada elemento de la navegación inferior: **concepto B seleccionado**. El icono se coloca encima del nombre y ambos quedan centrados horizontalmente. Esta decisión complementa el tratamiento cromático anterior, pero no aprueba todavía la composición completa de la navegación.
- Respuesta visual al pulsar una sección de la navegación inferior: **opción B seleccionada**. El elemento pulsado se comprime sutilmente hasta una escala de **0,96** mientras se mantiene la pulsación y recupera su escala original al soltar. El efecto es transitorio y no modifica el color de selección, la superficie común ni añade fondos o cápsulas interiores. La duración y curva de esta microinteracción quedan pendientes de definir.
- Tamaño de los nombres «Personal» y «Descubrir» en la navegación inferior: **12 px** en ambas secciones.
- Separación vertical entre el icono y el nombre de cada sección de la navegación inferior: **4 px**.
- Peso tipográfico en la navegación inferior: sección activa **medio (500)**; sección inactiva **regular (400)**. El cambio de peso acompaña al color de estado y no añade una cápsula interior.
- Tamaño de los iconos de Personal y Descubrir en la navegación inferior: **20 px** en ambas secciones.
- Estilo gráfico de los iconos de Personal y Descubrir en la navegación inferior: **opción A seleccionada, iconografía lineal**, basada en trazos y no en siluetas rellenas.
- Grosor del trazo de los iconos de la navegación inferior: **opción A seleccionada, 1,4 px**, fino y ligero.
- Símbolo de la sección **Personal** en la navegación inferior: **silueta lineal de usuario**.
- Símbolo de la sección **Descubrir** en la navegación inferior: **destellos lineales**, asociados al descubrimiento y las recomendaciones.
- Separación inferior de la píldora flotante respecto al área de gestos del sistema: **16 px** (concepto A), medida desde el borde inferior de la píldora hasta el límite superior del área de gestos.
- Posición horizontal de la píldora flotante inferior: **opción A seleccionada, centrada respecto al ancho total de la pantalla**; su eje central coincide con el eje central horizontal de la pantalla y no depende de los márgenes del contenido.
- La navegación inferior debe percibirse como una **píldora realmente flotante**, independiente del borde inferior y del contenido; no debe convertirse en una barra fija de ancho completo. La píldora **no lleva sombra**. Su sensación flotante se logra mediante su separación respecto al borde inferior y al contenido, junto con el contraste entre la superficie `#222222` y el fondo `#131313`.
- Al desplazarse hacia abajo por el contenido, la píldora de navegación inferior **se oculta**.
- La ocultación no se activa con el primer movimiento: espera a que el desplazamiento acumulado hacia abajo alcance **24 px**. Los movimientos inferiores a ese umbral mantienen la píldora visible.
- Cuando el usuario invierte el sentido del desplazamiento y comienza a deslizar hacia arriba, la píldora de navegación inferior **reaparece inmediatamente**, incluso si todavía se encuentra a mitad del contenido.
- Si la píldora todavía está ejecutando la animación de reaparición y el usuario vuelve a desplazar hacia abajo, la animación de entrada **se interrumpe inmediatamente y cambia de dirección desde la posición visual alcanzada**, sin esperar a completar los 280 ms. El umbral de 24 px se mantiene para iniciar la ocultación cuando la píldora ya está completamente visible.
- La ocultación y reaparición utilizan una **animación de deslizamiento vertical**: al ocultarse, la píldora se desplaza hacia abajo y sale de la pantalla; al reaparecer, entra desde abajo hasta recuperar su posición habitual. Duración de la animación: **180 ms para la desaparición** y **280 ms para la reaparición**. Curvas de aceleración diferenciadas: **desaparición con aceleración progresiva (ease-in)**, que comienza suavemente y gana velocidad al salir hacia abajo; **reaparición con desaceleración progresiva (ease-out)**, que entra con rapidez y se suaviza al recuperar su posición habitual. Curvas Bézier seleccionadas, de intensidad equilibrada: **desaparición** `cubic-bezier(0.4, 0, 1, 1)` y **reaparición** `cubic-bezier(0, 0, 0.2, 1)`. La salida mantiene una aceleración progresiva y la entrada una desaceleración progresiva.

- Feed predeterminado de tres columnas.
- En las propuestas visuales del Feed no se muestran rótulos o encabezados como «Películas» ni subtítulos como «Para descubrir».
- Cada elemento del Feed muestra únicamente la portada, sin título, año, descripción ni ningún otro texto debajo de la imagen. Se mantienen los marcadores de estado aprobados cuando correspondan.
- Diseño alternativo de mosaico de tres columnas, mezclando pósteres verticales con imágenes horizontales de doble o triple ancho.
- Desplazamiento infinito.
- Marcapáginas azul para Vista y gris para Pendiente.

### Personal: listas personalizadas

- «Gestionar listas» es una sección propia de Personal para crear y administrar listas cinematográficas personalizadas.
- Cada lista muestra un nombre obligatorio y una descripción opcional.
- Cada lista tiene un color identificativo elegible al crearla, visible discretamente junto al nombre y en detalles.
- Los colores se seleccionan de una paleta predeterminada y curada por Prisma, no de un selector libre.
- Los tonos concretos se propondrán en el sistema de diseño y requerirán aprobación del propietario.
- Cada lista puede mostrar la acción «FIJAR»; no se rotulará como «Favoritas».
- Las listas fijadas se muestran primero en «Gestionar listas», por encima de las no fijadas.
- Las listas se pueden reordenar entre sí mediante arrastre, siempre dentro de su grupo (fijadas o no fijadas); las fijadas permanecen arriba.
- El color de identidad no modifica los colores de los pósteres que componen el collage.
- La portada de cada lista es un collage de pósteres de las películas incluidas; se actualiza al cambiar el contenido.
- La acción de eliminar una lista no elimina las películas ni sus datos; solo retira la lista y las asociaciones de pertenencia.
- Antes de confirmar la eliminación, se presenta una ventana con el nombre de la lista y las opciones «CANCELAR» y «ELIMINAR».
- Las portadas se pueden reordenar manualmente mediante arrastre.
- Se podrá cambiar temporalmente el criterio de ordenación sin perder el orden manual guardado.
- Cada lista ofrece controles de filtros propios, separados de los de otras listas y de Descubrir.
- Cuando sea lógico, los controles permitirán combinar condiciones con AND u OR.
- AND aparece seleccionado inicialmente; OR se ofrece como alternativa visible cuando la combinación lo admita.
- El panel de filtros de cada lista parte de los filtros de Descubrir y puede crecer con filtros adicionales que se aprueben; su contenido se definirá al diseñar esa pantalla.
- No debe confundirse visual ni funcionalmente con Historial o Pendientes.
- Desde una ficha, «GESTIONAR LISTAS» abre una ventana con la relación de listas personalizadas y casillas de selección múltiple; las casillas reflejan la pertenencia actual de la película.

### Ficha de película

- Cabecera horizontal a todo lo ancho, con degradado inferior, título en blanco y controles circulares semitransparentes.
- Claqueta gris sobre fondo gris oscuro como sustituto si falta imagen.
- Datos básicos en una línea separados por barras.
- Márgenes laterales constantes, secciones separadas por espacio.
- Pocas tarjetas; las tarjetas se reservan para plataformas y los componentes que el diseño final justifique.
- Acciones, puntuaciones, proveedores, reparto/equipo, colecciones y películas relacionadas siguen el orden funcional descrito en Requisitos.

## Referencia de componentes

Todavía no hay un sistema de diseño completo aprobado. La paleta base de Dark Mode está confirmada en tres roles: fondo `#131313`, superficies elevadas `#222222` y acento `#5B9BD5`. Para las tarjetas de Personal también están confirmados el neutro `#D0D0D0` de los iconos inactivos, el contorno `#353535` de 1 px y el color `#F0F0F0` de los nombres; los iconos activos podrán utilizar el acento azul. La familia tipográfica general, otros tonos de texto y neutros, demás bordes, estados adicionales y una eventual paleta para tema claro siguen pendientes.

## Decisiones de concepto pendientes de aprobación

- Para la entrada a Personal se eligió el **concepto A**: una pantalla principal con cinco accesos. La distribución aprobada es una cuadrícula de dos columnas para Historial, Pendientes, Ocultos y Estadísticas, más Gestionar listas en una fila de ancho completo. El aspecto final de la pantalla sigue pendiente de aprobación; no implementar hasta cerrar el diseño.

## Registro de aprobaciones visuales

| Elemento | Estado | Versión de implementación |
|---|---|---|
| Sistema de diseño | Pendiente de concepto y aprobación | Por definir |
| Paleta de colores Dark Mode | Confirmada: fondo `#131313`, superficies `#222222`, acento `#5B9BD5` | Por definir |
| Pantalla Descubrir | Estructura funcional acordada; diseño visual pendiente | Por definir |
| Navegación Personal/Descubrir | Estructura funcional acordada; diseño visual pendiente | Por definir |
| Personal: pantalla principal | Concepto A, distribución y decisiones parciales de tarjetas aprobadas; aspecto final todavía en borrador | Por definir |
| Personal: Historial | Pendiente de concepto y aprobación | Por definir |
| Personal: Pendientes | Pendiente de concepto y aprobación | Por definir |
| Personal: Ocultos | Pendiente de concepto y aprobación | Por definir |
| Personal: Estadísticas | Pendiente de concepto y aprobación | Por definir |
| Personal: Gestionar listas | Estructura funcional acordada; diseño visual pendiente | Por definir |
| Ficha cinematográfica | Estructura funcional detallada; diseño visual pendiente | Por definir |
| Ajustes | Requisitos funcionales; diseño visual pendiente | Por definir |

No se debe implementar el diseño visual de una pantalla mientras su concepto siga pendiente.
