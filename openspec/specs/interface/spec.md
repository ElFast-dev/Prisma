# Interfaz y navegación

## Requirements

### Requirement: Interfaz en español y adaptada a móvil

La interfaz DEBE estar en español y mantener una composición funcional en pantallas móviles, especialmente Android, sin impedir el uso desde escritorio.

#### Scenario: Uso desde una pantalla estrecha

- DADO que el viewport tiene ancho móvil
- CUANDO se navega por las vistas principales
- ENTONCES la navegación y los controles siguen disponibles sin depender de hover

### Requirement: Navegación entendible

Prisma DEBE mantener accesibles las vistas principales de progreso, descubrimiento y colección, además de las vistas de laboratorio y ajustes/datos.

#### Scenario: Cambio de vista

- DADO que el usuario selecciona un destino de navegación
- CUANDO se activa el control correspondiente
- ENTONCES se renderiza la vista solicitada y el estado de navegación se actualiza

#### Scenario: Vista activa anunciada

- DADO que Prisma muestra Progreso, Descubrir o Colección
- CUANDO se actualiza la navegación tras renderizar la vista
- ENTONCES exactamente un destino principal expone `aria-current="page"` y coincide con la vista seleccionada

### Requirement: Objetivos táctiles cómodos

Prisma DEBE presentar controles frecuentes con objetivos táctiles adecuados en pantallas móviles: al menos 48 píxeles CSS de alto para los destinos de la barra inferior y al menos 44 × 44 píxeles CSS para las acciones de icono de la cabecera. Las pulsaciones táctiles NO DEBEN depender de hover ni de una animación de escala.

#### Scenario: Navegación desde un móvil

- DADO que Prisma se muestra en un viewport de hasta 760 píxeles CSS
- CUANDO aparecen la barra inferior y las acciones de icono de la cabecera
- ENTONCES los destinos principales ofrecen al menos 48 píxeles de altura y cada acción de icono ofrece al menos 44 × 44 píxeles CSS

#### Scenario: Pulsación sin animación de escala

- DADO un dispositivo con puntero táctil
- CUANDO la persona pulsa un destino de la barra inferior
- ENTONCES el control responde sin reducirse mediante una transformación de escala

### Requirement: Estados interactivos consistentes

Prisma DEBE comunicar de manera consistente los estados hover, activo y foco de los controles de colección, sin cambios de geometría inesperados ni decoración que distraiga del contenido cinematográfico.

#### Scenario: Hover sobre una fila en escritorio

- DADO una fila de película en la colección y un dispositivo con puntero preciso
- CUANDO se pasa el puntero sobre su área principal
- ENTONCES la fila muestra un fondo violeta sutil, sin desplazarse verticalmente el botón principal

#### Scenario: Retirar el puntero

- DADO una fila de colección que muestra el fondo hover
- CUANDO el puntero sale de la fila
- ENTONCES vuelve suavemente al estado visual base

#### Scenario: Uso táctil

- DADO una pantalla móvil donde no hay hover fiable
- CUANDO se pulsa una fila de colección
- ENTONCES el control mantiene su acción de apertura y no necesita depender del estado hover

#### Scenario: Navegación por teclado

- DADO que el usuario alcanza la acción principal mediante teclado
- CUANDO el control recibe foco
- ENTONCES un indicador de foco visible distingue el control del fondo

#### Scenario: Preferencia de movimiento reducido

- DADO que el sistema indica `prefers-reduced-motion: reduce`
- CUANDO se usa la interfaz
- ENTONCES las transiciones de microinteracción se eliminan o reducen y no se agrega animación continua

### Requirement: Estados y mensajes perceptibles

La interfaz DEBE comunicar carga, errores y confirmaciones de acciones importantes mediante elementos visuales perceptibles, con semántica accesible cuando corresponde.

#### Scenario: Importación fallida

- DADO que un archivo no cumple el formato reconocido
- CUANDO falla la importación
- ENTONCES el usuario recibe un mensaje que describe el problema en lugar de una falsa confirmación


### Requirement: Orientación inicial para un perfil sin valoraciones

Cuando el perfil no contiene valoraciones válidas, Prisma DEBE mostrar una guía breve en Progreso que explique cómo empezar a aportar señales al recomendador y proporcione rutas a explorar películas e importar el historial. La guía DEBE desaparecer cuando exista al menos una valoración válida.

#### Scenario: Primera visita sin valoraciones

- DADO que el perfil no tiene valoraciones válidas
- CUANDO se abre la vista Progreso
- ENTONCES aparece una guía breve con acciones para explorar películas e importar historial

#### Scenario: Navegación desde la guía

- DADO que la guía inicial está visible en Progreso
- CUANDO se pulsa «Explorar películas» o «Importar historial»
- ENTONCES se abre Descubrir o Ajustes/Datos, respectivamente

#### Scenario: El perfil ya tiene una valoración

- DADO que el perfil guarda al menos una valoración válida
- CUANDO se abre la vista Progreso
- ENTONCES la guía de primera ejecución no aparece


### Requirement: Cuadrícula de Descubrir centrada en el póster

Prisma DEBE mostrar las películas de las cuadrículas de Descubrir como pósteres interactivos, sin duplicar en las tarjetas el título, metadatos, predicción ni acciones disponibles en la ficha. Cada póster DEBE abrir la ficha de la identidad seleccionada.

#### Scenario: Catálogo local con póster disponible

- DADO que el catálogo local contiene una película con imagen de póster
- CUANDO se muestra la cuadrícula de Descubrir
- ENTONCES solo se ve la carátula sin título externo, año, géneros, nota estimada ni botones de acciones

#### Scenario: Abrir una película desde su póster

- DADO un póster de una película en Descubrir
- CUANDO se pulsa o se activa mediante teclado el póster
- ENTONCES se abre la ficha completa de esa película con sus acciones y datos disponibles

#### Scenario: Película sin carátula disponible

- DADO que un registro no tiene imagen de póster
- CUANDO aparece en la cuadrícula
- ENTONCES se muestra un fallback visual con el título y la acción sigue siendo accesible

### Requirement: Jerarquía limpia en Colección

Prisma DEBE presentar «Películas» y «Listas» como selector principal de la vista Colección, seguido de las pestañas de historial/pendientes/ocultos y una barra agrupada de herramientas de la colección activa.

#### Scenario: Orden de controles de Colección

- DADO que se abre Colección en modo Películas
- CUANDO se presenta la vista
- ENTONCES Películas/Listas aparecen primero, después Historial/Pendientes/Ocultos, y después búsqueda/orden/géneros/filtro/vista

#### Scenario: Herramientas según pestaña activa

- DADO que la pestaña Pendientes está activa
- CUANDO se presentan sus herramientas
- ENTONCES se incluye el filtro «Estrenada» además de buscar, ordenar, géneros y alternar vista

### Requirement: Diseño de recientes en dos por dos

La sección de recientes DEBE mostrar hasta cuatro películas en una cuadrícula de dos columnas y dos filas, con póster horizontal, año y título superpuestos y legibles.

#### Scenario: Historial con cuatro o más películas

- DADO un historial con cuatro o más títulos
- CUANDO se muestra Historial
- ENTONCES Añadidos recientemente presenta los cuatro registros más recientes en una cuadrícula 2×2

### Requirement: Procedencia explícita de las puntuaciones en la ficha

Prisma DEBE distinguir visualmente la valoración personal de una película de la puntuación pública de una fuente externa. Las cifras que la ficha atribuye a TMDB DEBEN tener procedencia TMDB confirmada; los enlaces a otros servicios DEBEN presentarse como consultas externas cuando Prisma no obtiene una puntuación integrada.

#### Scenario: Puntuación pública de TMDB disponible

- DADO que la ficha contiene una nota media válida cuya procedencia está marcada como TMDB
- CUANDO se muestran los indicadores de puntuación
- ENTONCES la nota enlaza a la película correspondiente de TMDB y el recuento de votos aparece solo si la fuente lo ha proporcionado

#### Scenario: Puntuación no disponible o sin procedencia confirmada

- DADO que falta la nota media o el registro no confirma procedencia TMDB
- CUANDO se muestra la ficha
- ENTONCES Prisma no presenta ese dato como una nota TMDB numérica y ofrece un enlace para consultar la fuente cuando esté disponible

#### Scenario: IMDb ID ausente

- DADO que la ficha no contiene un IMDb ID
- CUANDO se abre el indicador IMDb
- ENTONCES se abre la búsqueda de IMDb por título en lugar de un enlace a otro servicio

#### Scenario: Puntuaciones de otros sitios no integradas

- DADO que Prisma no obtiene directamente las cifras de IMDb, Rotten Tomatoes o Metacritic
- CUANDO se muestran sus indicadores
- ENTONCES estos se identifican como búsquedas externas y no como puntuaciones numéricas de Prisma


### Requirement: Ficha desplazable con sinopsis completa

La ficha de película DEBE permitir desplazarse dentro del modal hasta el final de la sinopsis y las secciones posteriores, en móvil y escritorio. El contenido DEBE permanecer accesible aunque la sinopsis sea larga.

#### Scenario: Sinopsis extensa

- DADO que una película tiene una sinopsis que ocupa más que el espacio visible
- CUANDO la persona abre la ficha y se desplaza hacia abajo
- ENTONCES puede leer la sinopsis completa y alcanzar las secciones inferiores

### Requirement: Fecha del historial sin hora

Prisma DEBE mostrar la fecha en la que una película se añadió al historial como MM/DD/YYYY, sin incluir hora ni minutos.

#### Scenario: Fecha de vista registrada

- DADO que una película tiene una fecha de historial válida
- CUANDO se muestra su estado dentro de la ficha
- ENTONCES la fecha usa el formato MM/DD/YYYY y no contiene una hora

### Requirement: Indicadores de puntuación compactos

La sección Puntuaciones DEBE usar tarjetas de tamaño compacto, cuya altura esté ajustada al contenido en vez de usar cuadrados altos vacíos, y conservar un diseño legible en móvil y escritorio.

#### Scenario: Pantalla de escritorio o móvil

- DADO que se abre la ficha de una película
- CUANDO se muestran los enlaces e indicadores de puntuación
- ENTONCES las tarjetas son compactas y no ocupan altura excesiva respecto a sus textos



### Requirement: Sistema visual cinematográfico

Prisma DEBE definir tokens visuales compartidos y usarlos en la navegación, los botones principales, los filtros seleccionados, los campos enfocados y los controles de película. El acento de marca DEBE ser un azul acero discreto sobre fondo negro predeterminado, con un modo claro opcional; los colores semánticos de puntuación, éxito y error DEBEN conservar su significado. Los estados principales NO DEBEN depender de hover.

#### Scenario: La interfaz muestra estados de marca

- DADO que el usuario navega por Progreso, Descubrir o Colección
- CUANDO existe una acción primaria o un destino de navegación activo
- ENTONCES el componente usa el acento compartido, mantiene un contraste perceptible y deja que los pósteres sigan siendo el foco visual.

#### Scenario: El usuario utiliza controles con teclado

- DADO que el usuario enfoca un botón, filtro, campo o póster mediante teclado
- CUANDO el control recibe foco visible
- ENTONCES el indicador usa el acento del sistema visual, sin desplazar el contenido ni ocultar el límite del control.

### Requirement: Preferencia de tema personal

Prisma DEBE ofrecer un tema oscuro con fondo negro como predeterminado y un modo claro opcional. El color secundario de marca DEBE ser un azul discreto; los colores semánticos de puntuación, éxito y error DEBEN seguir siendo distinguibles. La elección DEBE poder cambiarse sin recargar y persistirse localmente, fuera del perfil cinematográfico. Si no existe una preferencia válida, Prisma DEBE utilizar el modo oscuro.

#### Scenario: Primera apertura

- DADO que el navegador no tiene guardada una preferencia de tema válida
- CUANDO Prisma inicia
- ENTONCES se aplica el tema oscuro con fondo negro y azul secundario apagado.

#### Scenario: Elegir el modo claro

- DADO que el usuario abre Ajustes
- CUANDO selecciona Claro
- ENTONCES la interfaz aplica fondo claro, superficies blancas y texto oscuro sin recargar y el selector indica la opción activa de forma accesible.

#### Scenario: Elegir el modo oscuro

- DADO que el usuario tiene activo el tema claro
- CUANDO selecciona Oscuro
- ENTONCES Prisma restaura el fondo negro, las superficies neutras y el acento azul discreto.

#### Scenario: Restaurar una preferencia

- DADO que el usuario ha elegido Claro u Oscuro y recarga la aplicación
- CUANDO Prisma vuelve a iniciar
- ENTONCES restaura la última elección almacenada localmente.

#### Scenario: Preferencia inválida o almacenamiento bloqueado

- DADO que el valor guardado no es `light` ni `dark`, o el navegador bloquea localStorage
- CUANDO Prisma inicia
- ENTONCES continúa con tema oscuro sin impedir el uso de la aplicación.



### Requirement: Controles de mezcla de recomendaciones en Descubrir

Descubrir DEBE mostrar recomendaciones antes de los resultados adicionales y ofrecer un selector compacto para Equilibrado, Más afines y Más variedad. El control activo DEBE exponerse mediante `aria-pressed`; la preferencia DEBE guardarse solo en el dispositivo. Cuando no existan características personales enlazadas, Prisma DEBE explicar esa limitación sin presentar la lista como gustos ya aprendidos.

#### Scenario: Orden de contenido en Descubrir

- DADO que se abre Descubrir
- CUANDO se representa su contenido
- ENTONCES las recomendaciones y el selector de enfoque aparecen antes de la exploración remota y del catálogo adicional

#### Scenario: Selector accesible

- DADO que se muestran los tres modos de recomendación
- CUANDO uno está seleccionado
- ENTONCES el grupo tiene un nombre accesible y solo el modo actual expone `aria-pressed="true"`

#### Scenario: Perfil sin metadatos enlazados

- DADO que no hay valoraciones enlazadas a características del catálogo
- CUANDO se abre Descubrir
- ENTONCES la interfaz explica que necesita esas señales antes de afirmar que las sugerencias reflejan gustos personales


### Requirement: Descubrir comunica un inicio realmente vacío

Cuando no hay películas personales ni catálogo local, Prisma DEBE distinguir la colección personal del contenido remoto de TMDB y DEBE explicar cómo descubrir títulos sin poblar el perfil por defecto.

#### Scenario: Descubrir sin películas locales

- DADO que el catálogo local combinado contiene cero películas
- CUANDO se abre Descubrir
- ENTONCES se indica que no hay películas locales y no aparecen pósteres de muestra

#### Scenario: TMDB no está conectado

- DADO que no existe una credencial TMDB configurada
- CUANDO se presenta el espacio de descubrimiento vacío
- ENTONCES se indica que hay que conectar TMDB desde Ajustes/Datos para explorar películas


### Requirement: Ficha de película con jerarquía y lectura cómoda

La ficha DEBE presentar los metadatos, la sinopsis y las acciones con contraste, separación y tamaño legibles en los temas oscuro y claro. Los controles principales de la ficha DEBEN conservar objetivos táctiles cómodos en móvil, y los cambios visuales NO DEBEN degradar el desplazamiento de sinopsis extensas ni la compacidad de las puntuaciones externas.

#### Scenario: Metadatos legibles en pantallas grandes y pequeñas

- DADO que una película tiene fecha de estreno, país, duración y estado
- CUANDO se abre la ficha en escritorio o móvil
- ENTONCES los metadatos se presentan como bloques diferenciados, con una cuadrícula adaptable de cuatro columnas en escritorio y dos en móvil

#### Scenario: Lectura de sinopsis

- DADO que una película tiene una sinopsis extensa
- CUANDO se abre la ficha en cualquiera de los temas disponibles
- ENTONCES la sinopsis mantiene un tamaño de letra legible, interlineado suficiente y la posibilidad de desplazarse hasta el final

#### Scenario: Acciones utilizables con el tacto

- DADO que la ficha se utiliza desde una pantalla táctil
- CUANDO se muestran las acciones de historial, pendientes, listas, ocultar o calificar
- ENTONCES sus controles principales tienen una altura mínima de 44 píxeles CSS y pueden distribuirse en varias filas sin desbordar el ancho de pantalla

#### Scenario: Fondo de ficha coherente con el tema

- DADO que la persona utiliza el modo oscuro o claro
- CUANDO el encabezado de la ficha muestra un fondo cinematográfico o un fondo de sustitución
- ENTONCES el degradado termina en una superficie del tema actual y no introduce un color de fondo azul fijo


### Requirement: Comunicación clara del experimento de regularización

El Laboratorio DEBE mostrar el MAE de la variante experimental, su diferencia contra el modelo base y el tamaño de muestra cuando la comparación esté disponible. DEBE aclarar que la variante no cambia las recomendaciones activas y que la diferencia descriptiva no prueba significación estadística.

#### Scenario: Comparación disponible

- DADO que al menos cinco películas tienen características evaluables
- CUANDO se abre el Laboratorio
- ENTONCES se muestra la diferencia `MAE base − MAE regularizado` y se explica qué signo favorece a cada variante

#### Scenario: Comparación insuficiente

- DADO que hay menos de cinco muestras evaluables
- CUANDO se abre el Laboratorio
- ENTONCES se explica que el experimento necesita más valoraciones enlazadas


### Requirement: Control explícito de evaluación Ridge

El Laboratorio DEBE ofrecer una acción explícita para calcular Ridge y mostrar su estado y métricas agregadas. El cálculo NO DEBE ocurrir en cada renderizado ni cambiar el comportamiento de Descubrir.

#### Scenario: Ejecutar y revisar Ridge

- DADO que se abre el Laboratorio
- CUANDO se pulsa ejecutar experimento Ridge
- ENTONCES se muestra el cálculo local y después el MAE Ridge y la base aditiva emparejados, el tamaño de muestra y los parámetros seleccionados

#### Scenario: Historial actualizado

- DADO que se modifican las valoraciones guardadas durante la sesión
- CUANDO vuelve a renderizarse el Laboratorio
- ENTONCES los resultados Ridge anteriores se invalidan

### Requirement: Acción explícita para validación Ridge repetida

El Laboratorio DEBE ofrecer una acción separada para ejecutar la validación cruzada repetida de Ridge y presentar métricas agregadas por repetición y globales. El cálculo NO DEBE ocurrir al abrir o renderizar el Laboratorio ni alterar Descubrir.

#### Scenario: Evaluación repetida bajo demanda

- DADO que el Laboratorio ya muestra los resultados Ridge estándar
- CUANDO se solicita la validación repetida
- ENTONCES Prisma ejecuta el protocolo local 3 × 5, informa el estado del cálculo y presenta los agregados cuando termina

#### Scenario: Separación de la recomendación activa

- DADO que se completa la validación repetida
- CUANDO el usuario vuelve a Descubrir
- ENTONCES el ranking activo sigue siendo aditivo y no se modifican las preferencias ni los datos personales

### Requirement: Mostrar consistencia entre repeticiones de Ridge

El Laboratorio DEBE mostrar, de forma diferenciada de la estabilidad por pliegue, cuántas repeticiones favorecen a Ridge y el rango de diferencias MAE y nDCG@5 observado cuando la métrica está disponible. La interfaz DEBE indicar que el rango describe las repeticiones realizadas sobre el mismo historial y NO constituye un intervalo de confianza.

#### Scenario: Lectura rápida de consistencia

- DADO que las métricas por repetición están disponibles
- CUANDO el usuario consulta el experimento Ridge
- ENTONCES puede distinguir el resultado agregado por repetición del recuento de victorias, empates y derrotas por pliegue

#### Scenario: Advertencia de interpretación

- DADO que se presentan recuentos y rangos de tres repeticiones
- CUANDO la persona consulta el resumen
- ENTONCES Prisma explica que son medidas descriptivas sobre el mismo historial, no evidencia estadística independiente

### Requirement: Control explícito de validación temporal

El Laboratorio DEBE ofrecer un control separado para ejecutar la validación temporal de Ridge sin iniciarla automáticamente. DEBE comunicar su progreso, el recuento de valoraciones fechadas y sin fecha válida, el número de ventanas y las métricas agregadas disponibles. No DEBE mostrar fechas exactas ni registros individuales.

#### Scenario: Ejecutar evaluación temporal desde el Laboratorio

- DADO que la persona está en el Laboratorio
- CUANDO solicita la evaluación temporal
- ENTONCES Prisma muestra el progreso de cinco ventanas, los resultados agrupados y una advertencia de que solo describe el historial disponible

#### Scenario: Historial insuficiente o sin fechas fiables

- DADO que los datos no tienen suficientes valoraciones con `watchedAt` válido
- CUANDO se ejecuta la evaluación
- ENTONCES la interfaz explica los mínimos y los recuentos disponibles, sin métricas parciales no válidas

#### Scenario: Cambia el historial durante el cálculo

- DADO que se está ejecutando la evaluación temporal
- CUANDO cambian las valoraciones o el historial de visionados
- ENTONCES se cancela el cálculo y no se muestra ni exporta un resultado obsoleto
