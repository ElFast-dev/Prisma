# Estado visual — Prisma

**Estado:** dirección visual en descubrimiento. No hay sistema de diseño ni pantallas aprobadas todavía.  
**Última actualización:** 6 de noviembre de 2026.

## Reglas de diseño

## Regla permanente para crear conceptos visuales

Cada vez que se presenten conceptos visuales para Prisma, deben ser propuestas trabajadas y de calidad de presentación, no simples bocetos repetidos o variaciones superficiales.

Criterios obligatorios:
- Revisar primero este documento y los requisitos de producto para respetar todas las decisiones aprobadas y no reabrirlas accidentalmente.
- Mostrar la pantalla o componente dentro de su contexto real de uso, con composición completa y jerarquía visual clara.
- Cuando se comparen alternativas, mantener constantes los elementos ya aprobados y cambiar únicamente la variable que se está evaluando, salvo que la comparación solicite explícitamente explorar direcciones distintas.
- Hacer que las alternativas sean visualmente distinguibles y que cada una tenga una intención de diseño reconocible; evitar duplicados que solo cambien una cifra sin que la diferencia se perciba.
- Cuidar proporciones, alineaciones, ritmo de espaciado, márgenes, tipografía, iconografía y estados, manteniendo coherencia entre la intención funcional, las reglas de producto, el comportamiento de interacción y su representación visual. Ningún componente debe diseñarse de forma aislada ni sugerir algo que la lógica de Prisma no respalde.
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

### Sistema tipográfico global — familia seleccionada

- Familia tipográfica global: **Inter** (selección aprobada). Se utilizará como familia de referencia para la interfaz de Prisma.
- Pesos globales aprobados para Inter: **regular (400), medio (500) y seminegrita (600)**. La asignación de pesos se define progresivamente: los títulos de sección utilizan **medio (500)** (opción A aprobada) y el texto normal de lectura continua utiliza **regular (400)** (opción A aprobada); los pesos de los demás niveles generales siguen pendientes. Esta decisión no obliga a utilizar los tres pesos en cada pantalla.
- Tamaño de referencia para el texto normal de lectura continua: **16 px** (opción B aprobada). Es la base de la escala tipográfica global; no reemplaza los tamaños específicos ya definidos para títulos, años, contadores, navegación ni otros componentes. El peso tipográfico de referencia para este texto normal es **regular (400)** (opción A aprobada). La altura de línea queda fijada en **24 px** (opción B aprobada), equivalente a 1,5 veces el tamaño de fuente. Las alturas de línea de los demás niveles se definirán por separado al completar la escala.
- Tamaño de referencia para el texto secundario: **14 px** (opción A aprobada). Es el segundo nivel general de la jerarquía tipográfica y no reemplaza tamaños específicos ya definidos para componentes, como los años y contadores de 12 px o los textos de 14 px con reglas propias. La altura de línea de referencia para este texto secundario queda fijada en **20 px** (opción B aprobada). La asignación de peso se definirá al completar la escala; esta referencia no modifica las reglas tipográficas específicas de otros componentes.
- Tamaño de referencia para títulos de sección: **22 px** (opción B aprobada). Se aplica a encabezados generales de secciones y pantallas, como «Historial» o «Estadísticas». No sustituye tamaños ya definidos para títulos de películas ni otros encabezados o componentes con especificación propia. La altura de línea de referencia para estos títulos de sección queda fijada en **28 px** (opción B aprobada) y su peso tipográfico es **medio (500)** (opción A aprobada). Esta referencia no modifica las reglas tipográficas específicas de otros encabezados o componentes.
- Las decisiones tipográficas particulares ya aprobadas para Personal, navegación y resultados de búsqueda se conservan exactamente como están documentadas. La definición de la escala global no debe contradecirlas ni modificarlas sin una nueva aprobación.

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
- La aprobación cubre la distribución y estas decisiones parciales de las tarjetas, no el aspecto final: la pantalla sigue en borrador hasta definir y aprobar el sistema visual completo, la escala tipográfica global de Inter, demás tonos de texto, neutros, espaciado y detalles de los componentes.
- Siguen pendientes la familia tipográfica general, los demás tonos de texto y neutros, colores de estados adicionales, dimensiones definitivas, valores exactos del grosor de trazo, reglas de tema claro y demás componentes del sistema visual. Ya están definidos los tres roles cromáticos base de Dark Mode y los colores específicos de iconos inactivos, contorno y nombres de las tarjetas de Personal.

### Navegación y Descubrir

- Descubrir es la sección inicial.
- En la parte superior, **una única barra horizontal continua**: campo de búsqueda a la izquierda, con una **lupa lineal de 18 px y color `#BDBDBD`** (opción A seleccionada) antes del texto indicativo «Buscar...» (**14 px**, opción A seleccionada y color **`#BDBDBD`**, opción B seleccionada), con una separación horizontal de **8 px** respecto a este (opción A seleccionada), y dentro del mismo contenedor y superficie, icono de Filtros con forma de **embudo clásico alargado** (opción B seleccionada), con laterales suavemente curvos, con una curvatura sutil (opción A seleccionada), salida inferior larga y estrecha, con cuello recto de **6 px** (opción B seleccionada), boca superior de **13 px de ancho** (opción B seleccionada) y salida inferior de **3 px** (opción A seleccionada) e icono de Ajustes a la derecha; Ajustes debe representarse mediante un **engranaje lineal reconocible de geometría minimalista y compacta, con seis dientes exteriores simplificados, discretos y de proyección corta, y abertura central de 4 px de diámetro** (opción A seleccionada), no mediante el símbolo circular simplificado de las propuestas anteriores (`[Buscar...  (Filtros) (Ajustes)]`). Los tres elementos deben percibirse como partes integradas de una sola barra, no como controles o tarjetas independientes. Altura: **52 px** (opción B seleccionada). Radio de las esquinas: **26 px** (opción B seleccionada), con extremos completamente redondeados. Tamaño de los iconos de Filtros y Ajustes: **18 × 18 px**, con la misma escala visual aparente; el embudo debe ajustarse ópticamente para no percibirse más grande que el engranaje de Ajustes, color **`#BDBDBD`** (opción B seleccionada) y estilo **lineal fino, con un grosor de trazo de 1,4 px** (opción A seleccionada) y terminaciones de trazo **redondeadas** (`stroke-linecap: round`, opción A seleccionada), además de **uniones redondeadas** (`stroke-linejoin: round`, opción A seleccionada). Margen interior entre los bordes de la barra y sus elementos: **12 px** (opción A seleccionada). Separación horizontal entre los iconos de Filtros y Ajustes: **12 px** (opción A seleccionada). **Tratamiento de superficie de la barra: opción B seleccionada, sin contorno visible; utiliza únicamente la superficie `#222222` sobre el fondo `#131313`.** Margen lateral exterior seleccionado: **16 px** a izquierda y derecha, medido desde los bordes de la pantalla hasta los extremos del contenedor.
- Feed debajo del buscador.
- Separación vertical entre el borde inferior de la barra superior y el borde superior de la primera fila de pósteres: **16 px** (opción B seleccionada).
- Píldora flotante inferior, separada de los bordes, con Personal y Descubrir.
- Altura de la píldora flotante inferior: **64 px**.
- Ancho de la píldora flotante inferior: **240 px** (concepto A, formato compacto).
- Distribución horizontal de Personal y Descubrir dentro de la píldora: **concepto A seleccionado**, dos espacios iguales de **120 px** cada uno; cada sección centra su conjunto de icono y nombre dentro de su mitad.
- Forma exterior de la píldora flotante inferior: **concepto A seleccionado**, cápsula completa con radio de **32 px**.
- Grosor del contorno exterior de la cápsula de navegación inferior: **1 px**, color **`#353535`**.
- Tratamiento visual de la navegación inferior: **concepto B seleccionado**. La píldora exterior conserva la superficie **`#222222`** y un contorno de **1 px** en color **`#353535`**. La sección activa se distingue solo por el icono y el texto en azul de acento **`#5B9BD5`**, colocados directamente sobre la superficie común, sin cápsula ni fondo interior adicional. La sección inactiva utiliza icono y texto en gris **`#BDBDBD`**. El concepto define este tratamiento de selección, no aprueba todavía el diseño completo de la navegación ni de la pantalla.
- Cambio entre Personal y Descubrir: **opción B seleccionada, transición cromática suave**. El azul de acento `#5B9BD5` se transfiere gradualmente a la nueva sección activa y la sección anterior recupera el gris `#BDBDBD`. El cambio afecta únicamente al color: iconos, etiquetas y sus posiciones permanecen estables, sin desplazamientos ni fondos interiores. Duración de la transición cromática: **200 ms**. Curva de aceleración seleccionada: **`ease-in-out`**, con inicio y final suaves. Curva Bézier exacta: `cubic-bezier(0.42, 0, 0.58, 1)`.
- Disposición interna de cada elemento de la navegación inferior: **concepto B seleccionado**. El icono se coloca encima del nombre y ambos quedan centrados horizontalmente. Esta decisión complementa el tratamiento cromático anterior, pero no aprueba todavía la composición completa de la navegación.
- Respuesta visual al pulsar una sección de la navegación inferior: **opción B seleccionada**. El conjunto formado por el icono y el nombre se comprime sutilmente hasta una escala de **0,96** mientras se mantiene la pulsación y recupera su escala normal (**1,0**) al soltar. Duración: **100 ms para la compresión** y **160 ms para la recuperación**. No se añade fondo, cápsula interior ni cambio de color distinto al estado activo ya definido. Curvas de aceleración: **ease-out para la compresión y ease-out para la recuperación**.
- Tamaño de los nombres «Personal» y «Descubrir» en la navegación inferior: **12 px** en ambas secciones.
- Separación vertical entre el icono y el nombre de cada sección de la navegación inferior: **4 px**.
- Peso tipográfico en la navegación inferior: sección activa **medio (500)**; sección inactiva **regular (400)**. El cambio de peso acompaña al color de estado y no añade una cápsula interior.
- Tamaño de los iconos de Personal y Descubrir en la navegación inferior: **20 px** en ambas secciones.
- Estilo gráfico de los iconos de Personal y Descubrir en la navegación inferior: **opción A seleccionada, iconografía lineal**, basada en trazos y no en siluetas rellenas.
- Grosor del trazo de los iconos de la navegación inferior: **opción A seleccionada, 1,4 px**, fino y ligero.
- Terminaciones de los trazos de los iconos de la navegación inferior: **opción A seleccionada, redondeadas** (`stroke-linecap: round`), para conservar un acabado suave y delicado.
- Uniones entre segmentos de los trazos de los iconos de la navegación inferior: **opción A seleccionada, redondeadas** (`stroke-linejoin: round`), para mantener continuidad visual en los cambios de dirección.
- Símbolo de la sección **Personal** en la navegación inferior: **silueta lineal de usuario**. Geometría aprobada: **cabeza circular y hombros abiertos mediante una curva continua, sin círculo exterior** (opción A, usuario minimalista).
- Símbolo de la sección **Descubrir** en la navegación inferior: **tres destellos lineales de diferentes tamaños, formando una pequeña constelación** (opción B seleccionada), asociados al descubrimiento y las recomendaciones.
- Separación inferior de la píldora flotante respecto al área de gestos del sistema: **16 px** (concepto A), medida desde el borde inferior de la píldora hasta el límite superior del área de gestos.
- Posición horizontal de la píldora flotante inferior: **opción A seleccionada, centrada respecto al ancho total de la pantalla**; su eje central coincide con el eje central horizontal de la pantalla y no depende de los márgenes del contenido.
- La navegación inferior debe percibirse como una **píldora realmente flotante**, independiente del borde inferior y del contenido; no debe convertirse en una barra fija de ancho completo. La píldora **no lleva sombra**. Su sensación flotante se logra mediante su separación respecto al borde inferior y al contenido, junto con el contraste entre la superficie `#222222` y el fondo `#131313`.
- Al desplazarse hacia abajo por el contenido, la píldora de navegación inferior **se oculta**.
- La ocultación no se activa con el primer movimiento: espera a que el desplazamiento acumulado hacia abajo alcance **24 px**. Los movimientos inferiores a ese umbral mantienen la píldora visible.
- Cuando el usuario invierte el sentido del desplazamiento y comienza a deslizar hacia arriba, la píldora de navegación inferior **reaparece inmediatamente**, incluso si todavía se encuentra a mitad del contenido.
- Si la píldora todavía está ejecutando la animación de reaparición y el usuario vuelve a desplazar hacia abajo, la animación de entrada **se interrumpe inmediatamente y cambia de dirección desde la posición visual alcanzada**, sin esperar a completar los 280 ms. El umbral de 24 px se mantiene para iniciar la ocultación cuando la píldora ya está completamente visible.
- La ocultación y reaparición utilizan una **animación de deslizamiento vertical**: al ocultarse, la píldora se desplaza hacia abajo y sale de la pantalla; al reaparecer, entra desde abajo hasta recuperar su posición habitual. Duración de la animación: **180 ms para la desaparición** y **280 ms para la reaparición**. Curvas de aceleración diferenciadas: **desaparición con aceleración progresiva (ease-in)**, que comienza suavemente y gana velocidad al salir hacia abajo; **reaparición con desaceleración progresiva (ease-out)**, que entra con rapidez y se suaviza al recuperar su posición habitual. Curvas Bézier seleccionadas, de intensidad equilibrada: **desaparición** `cubic-bezier(0.4, 0, 1, 1)` y **reaparición** `cubic-bezier(0, 0, 0.2, 1)`. La salida mantiene una aceleración progresiva y la entrada una desaceleración progresiva.

- Feed predeterminado de tres columnas.
- Proporción de las portadas verticales del Feed: **2:3** (opción A seleccionada, formato cinematográfico clásico).
- Margen exterior del Feed: **16 px** a izquierda y derecha, medido desde los bordes de la pantalla hasta los extremos de la cuadrícula (opción B seleccionada).
- Separación horizontal entre pósteres de columnas adyacentes: **12 px** (opción B seleccionada).
- Separación vertical entre filas consecutivas de pósteres: **12 px** (opción B seleccionada).
- En las propuestas visuales del Feed no se muestran rótulos o encabezados como «Películas» ni subtítulos como «Para descubrir».
- Cada elemento del Feed muestra únicamente la portada, sin título, año, descripción ni ningún otro texto debajo de la imagen. Se mantienen los marcadores de estado aprobados cuando correspondan.
- Diseño alternativo de mosaico de tres columnas, mezclando pósteres verticales con imágenes horizontales de doble o triple ancho.
- Desplazamiento infinito.
- Marcapáginas azul `#5B9BD5` para Vista y gris `#D0D0D0` para Pendiente.
- Ubicación del marcapáginas: esquina superior derecha de cada portada. La distancia de **2 px** hacia el interior se mide desde el borde derecho de la portada hasta el extremo exterior visible del contorno del marcapáginas.
- El marcapáginas sobresale exactamente **6 px por encima del borde superior** de la portada, medidos hasta el extremo exterior visible de su contorno; debe leerse como una **pestaña física que marca la película**, no como un icono flotante superpuesto.
- Silueta seleccionada: **cinta clásica con muesca cóncava en V en el extremo inferior** (opción A). La anchura exterior visible total es de **16 px** (opción B), incluyendo el contorno. La profundidad exterior visible de la parte interior de la cinta es de **22 px**, medida desde el borde superior de la portada hasta el extremo exterior visible de las dos esquinas inferiores, sin contar los **6 px** que sobresalen por encima. La profundidad exterior visible de la muesca en V es de **6 px** (opción B), medida desde la línea que une las dos esquinas inferiores exteriores hasta el extremo exterior visible del vértice interior.
- **Orientación obligatoria de la muesca:** la V inferior es un recorte cóncavo que entra hacia dentro del cuerpo de la cinta. Su vértice interior apunta **hacia arriba**, en dirección al borde superior de la portada y al cuerpo de la pestaña; queda más alto que las dos esquinas inferiores exteriores. Por tanto, las esquinas exteriores quedan por debajo del vértice. **Nunca se debe invertir la V con el vértice apuntando hacia abajo o hacia fuera.**
- Radio exterior visible de las dos esquinas superiores de la cinta: **1 px** (opción B seleccionada). La forma y profundidad de la muesca inferior en V permanecen sin cambios.
- Terminación del vértice interior de la muesca: **aguda y definida** (opción A seleccionada), sin redondeo adicional ni tramo plano; el vértice apunta hacia dentro de la cinta.
- Tratamiento de las dos uniones inferiores exteriores entre los laterales y las diagonales de la muesca: **angular** (opción A seleccionada), con encuentros rectos, sin redondeo ni bisel. El vértice interior agudo de la muesca permanece orientado hacia dentro.
- Trayectoria de los dos lados diagonales de la muesca interior: **recta** (opción A seleccionada), sin curvatura; forman una V cóncava clásica con el vértice dirigido hacia dentro de la cinta.
- Simetría de la muesca interior: **opción A seleccionada, simétrica respecto al eje vertical central de la cinta**. El vértice interior queda centrado en el ancho exterior visible de 16 px y las dos diagonales tienen la misma inclinación; la geometría izquierda y derecha es un reflejo respecto a ese eje.
- Acabado interior de la cinta: **color sólido uniforme** (opción A seleccionada), sin degradado ni reflejo central.
- Sombra del marcapáginas: **sombra de contacto muy sutil**, color **`#000000`** (opción A), opacidad de **12 %** y radio de desenfoque de **0,5 px** (opción A); permanece pegada al contorno de la pestaña, con desplazamiento de **0 px**, y la separa visualmente de la portada sin producir un efecto elevado o artificial.
- Extensión de la sombra: **opción B seleccionada, solo en el contorno en contacto con la superficie de la portada**. Se aplica a los tramos del perímetro situados dentro de los límites de la imagen; se excluyen el borde superior y cualquier tramo de la pestaña que sobresalga por encima de la portada. No se modifica la intensidad, el desenfoque ni el desplazamiento ya aprobados.
- Todas las cotas geométricas del marcapáginas se refieren a su envolvente exterior visible e incluyen el contorno. El trazado interior debe ajustarse para que, una vez aplicado el contorno centrado, se mantengan exactamente esas dimensiones exteriores.
- Grosor del contorno del marcapáginas: **0,6 px** (opción B seleccionada).
- Posición del contorno respecto a la silueta: **centrado** (opción A seleccionada); con un grosor total de 0,6 px, se distribuye 0,3 px hacia el interior y 0,3 px hacia el exterior del límite de la forma.
- Tratamiento de las uniones del trazo del contorno: **angular** (opción A seleccionada), con encuentros nítidos y vértices definidos, sin redondeo ni bisel. Esta decisión regula únicamente la unión del trazo; no altera la silueta, la V cóncava simétrica, las dimensiones ni el grosor de 0,6 px ya aprobados.
- Tratamiento cromático del contorno: **tonal** (opción A seleccionada); cada borde utiliza un tono más oscuro que el relleno de su propio marcapáginas. Contorno azul de Vista: **`#3E78A7`** (opción A). Contorno gris de Pendiente: **`#A8A8A8`** (opción A).
- Comportamiento en el Feed de Descubrir: el marcapáginas es un **indicador visual exclusivamente informativo**, sin acción propia ni zona táctil independiente. La interacción táctil corresponde a la portada completa, que abre la ficha de la película; el estado Vista/Pendiente se modifica desde las acciones de esa ficha.
- Comportamiento en «También podría gustarte»: se mantiene el mismo criterio informativo del Feed de Descubrir. El marcapáginas no tiene acción ni zona táctil independiente; toda la portada abre la ficha de la película relacionada. Los cambios de estado se realizan desde las acciones de esa ficha.
- Aparición del marcapáginas al restaurar una película oculta: **directa** (opción A seleccionada), sin animación ni fundido de opacidad. Se muestra de inmediato el color del estado recuperado —Vista `#5B9BD5`, Pendiente `#D0D0D0`— o no se muestra si la película vuelve sin estado. La restauración no cambia el estado recuperado.
- Actualización del marcapáginas al volver a Descubrir después de modificar el estado desde la ficha: **directa, sin animación**. Se muestra inmediatamente el estado final (Vista: relleno `#5B9BD5`, contorno `#3E78A7`; Pendiente: relleno `#D0D0D0`, contorno `#A8A8A8`) o deja de mostrarse si ya no pertenece a ninguno de los dos estados. Esta regla cubre la asignación inicial, el cambio Vista/Pendiente y la eliminación del estado. No se animan el color, la opacidad, la entrada ni la salida, porque la modificación ocurre dentro de la ficha y Descubrir no está visible durante la acción.

### Buscador: marcapáginas en resultados
- Tamaño de cada miniatura de póster en los resultados: **56 × 84 px** (opción B), manteniendo la proporción cinematográfica **2:3**. El tamaño del póster es independiente de la escala del marcapáginas: el indicador sigue aplicando el **75 %** de las dimensiones de la cinta principal.
- Radio de las esquinas de las miniaturas de búsqueda: **2 px** (opción B aprobada). Se aplica exclusivamente al contorno de la miniatura de **56 × 84 px**; no modifica el radio ni la geometría del marcapáginas y no se extiende a los pósteres del Feed ni a «También podría gustarte».
- Alineación del bloque de texto: el título y el año se agrupan y se centran verticalmente respecto a la altura de la miniatura (**84 px**), manteniendo su alineación horizontal a la izquierda y la separación aprobada entre póster y texto.
- Separación horizontal entre la miniatura del póster y el bloque de texto: **12 px** (opción B seleccionada).
- Márgenes laterales de las filas de resultados: **16 px** a izquierda y derecha, medidos desde los bordes de la pantalla hasta los extremos de la fila. Las filas quedan alineadas horizontalmente con los extremos de la barra superior de búsqueda.
- Jerarquía tipográfica de los resultados: título de película de **14 px**, peso **medio (500)** y color **`#F0F0F0`** (opción A aprobada); año de **12 px**, peso **regular (400)** y color **`#BDBDBD`**. La diferencia de tamaño, peso y tono establece una jerarquía clara y contenida. Aplica exclusivamente a los resultados de búsqueda y no cierra el sistema tipográfico global.
- Tratamiento de títulos largos: el título ocupa como máximo **dos líneas**. Si supera ese espacio, se trunca al final de la segunda línea con puntos suspensivos (**…**). Entre las dos líneas del título no se añade espacio vertical adicional (**0 px adicionales**, opción A aprobada); se mantiene el interlineado tipográfico normal para evitar que se solapen. El año permanece en una línea independiente debajo del título, con **2 px** de separación; el bloque de título y año conserva su centrado vertical respecto a la miniatura.
- Separación vertical entre el título y el año: **2 px** (opción B seleccionada), manteniendo ambos dentro del bloque centrado verticalmente respecto a la miniatura.
- Separación vertical entre filas consecutivas de resultados de búsqueda: **12 px** (opción A seleccionada), medida desde el extremo inferior de la miniatura de una fila hasta el extremo superior de la miniatura de la fila siguiente.
- Indicador de película oculta en los resultados: se muestra la etiqueta textual **«Oculta»** en la línea secundaria, después del año y separada por un punto medio (por ejemplo, **«2024 · Oculta»**). Comparte el estilo visual del año: **12 px**, peso **regular (400)** y color **`#BDBDBD`**. No utiliza icono, cápsula, fondo ni elemento superpuesto al póster. Si no se conoce el año, se muestra únicamente «Oculta» en esa línea secundaria, sin inventar una fecha.

- En las miniaturas de póster de los resultados de búsqueda, el marcapáginas conserva la misma silueta de cinta con muesca cóncava en V, simetría, acabado sólido y correspondencia cromática que el marcador de tamaño normal del Feed, pero se representa al **75 % de su escala** para mantener el equilibrio con el póster reducido y el texto del resultado.
- La escala reducida del 75 % conserva esta misma orientación: el vértice de la muesca sigue apuntando hacia dentro y hacia arriba, por encima de las dos esquinas inferiores exteriores. Escalar la cinta nunca invierte la V.
- Medidas exteriores visibles resultantes: **12 px de ancho** y **16,5 px de profundidad interior**; sobresale **4,5 px** por encima del póster. La muesca cóncava mide **4,5 px** de profundidad. La separación hasta el borde derecho del póster es de **1,5 px** y el radio de las esquinas superiores es de **0,75 px**.
- El contorno conserva su posición centrada, uniones angulares y colores tonales; su grosor se escala de **0,6 px a 0,45 px**. Se mantienen los rellenos Vista **`#5B9BD5`** y Pendiente **`#D0D0D0`**, y los contornos Vista **`#3E78A7`** y Pendiente **`#A8A8A8`**.
- La sombra conserva el color negro, la opacidad del **12 %** y el desplazamiento de **0 px**; el desenfoque se escala de **0,5 px a 0,375 px**. Se limita al perímetro en contacto con la superficie del póster, excluyendo el borde superior y cualquier tramo que sobresalga por encima de la imagen.
- La escala reducida se aplica únicamente a las miniaturas de los resultados de búsqueda. No modifica el tamaño del marcapáginas del Feed ni el de «También podría gustarte».
- Comportamiento táctil de los resultados: el marcapáginas es exclusivamente informativo y no dispone de acción ni zona táctil independiente. Toda la fila —póster, título y año— abre la ficha de la película; los cambios entre Vista y Pendiente se realizan desde las acciones de esa ficha.

### Buscador: respuesta visual al mantener pulsada una fila

- Estado de pulsación seleccionado: **opción A, iluminación sutil**. Mientras se mantiene pulsada una fila completa, su superficie cambia temporalmente a **`#222222`** y adopta un **radio medio (`md`)**, sin contorno. Al soltar, vuelve a su apariencia normal. Es un resaltado transitorio, no una tarjeta permanente, y no utiliza el azul de acento.

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

Todavía no hay un sistema de diseño completo aprobado. La familia tipográfica global seleccionada es **Inter**, con pesos **400, 500 y 600** aprobados, **16 px** como tamaño de referencia para texto normal y **14 px** como tamaño de referencia para texto secundario. El texto normal queda definido en **16/24 px**, peso **regular (400)**; el texto secundario en **14/20 px**, con peso pendiente; y los títulos de sección en **22/28 px**, peso **medio (500)**. Siguen pendientes otros tamaños globales, la asignación de pesos para los demás niveles, las alturas de línea de los demás niveles y el espaciado entre caracteres. La paleta base de Dark Mode está confirmada en tres roles: fondo `#131313`, superficies elevadas `#222222` y acento `#5B9BD5`. Para las tarjetas de Personal también están confirmados el neutro `#D0D0D0` de los iconos inactivos, el contorno `#353535` de 1 px y el color `#F0F0F0` de los nombres; los iconos activos podrán utilizar el acento azul. Otros tonos de texto y neutros, demás bordes, estados adicionales y una eventual paleta para tema claro siguen pendientes.

## Decisiones de concepto pendientes de aprobación

- Para la entrada a Personal se eligió el **concepto A**: una pantalla principal con cinco accesos. La distribución aprobada es una cuadrícula de dos columnas para Historial, Pendientes, Ocultos y Estadísticas, más Gestionar listas en una fila de ancho completo. El aspecto final de la pantalla sigue pendiente de aprobación; no implementar hasta cerrar el diseño.

## Registro de aprobaciones visuales

| Elemento | Estado | Versión de implementación |
|---|---|---|
| Sistema de diseño | Pendiente de concepto y aprobación | Por definir |
| Familia tipográfica global | Inter; pesos 400, 500 y 600; texto normal 16/24 px, peso 400; texto secundario 14/20 px, peso pendiente; títulos de sección 22/28 px, peso 500; resto de la escala pendiente | Por definir |
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
