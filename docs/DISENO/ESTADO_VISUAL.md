# Estado visual — Prisma

**Estado:** dirección visual en descubrimiento. No hay sistema de diseño ni pantallas aprobadas todavía.  
**Última actualización:** 5 de noviembre de 2026.

## Reglas de diseño

- El propietario dirige la decisión visual.
- Los conceptos de pantalla se muestran en la conversación, no se sustituyen por imágenes generadas con IA.
- El sistema de diseño es la referencia principal para color, tipografía, botones, espaciado, iconos y estilo.
- Antes de diseñar una pantalla nueva, se consulta el sistema de diseño; si falta un componente, se propone y aprueba antes de usarlo.
- Cada pantalla se presenta para aprobación antes de cerrarla.
- Si se modifica una decisión aprobada, se actualiza el mismo artefacto de referencia, no se crean duplicados.
- Las decisiones aprobadas también se guardan en este repositorio para conservar memoria entre conversaciones.

## Requisitos visuales ya acordados

### Personal: pantalla principal (concepto A seleccionado, todavía en borrador)

- Al tocar Personal desde la píldora inferior, se abre un centro de navegación con cinco accesos visibles.
- Los accesos son Historial, Pendientes, Ocultos, Estadísticas y Gestionar listas.
- No se abre Historial directamente.
- La distribución queda aprobada como estructura: Historial, Pendientes, Ocultos y Estadísticas son cuatro tarjetas grandes en una cuadrícula de dos columnas; Gestionar listas es un acceso horizontal de ancho completo debajo.
- Concepto elegido para las cuatro tarjetas: **A, iconos grandes y minimalistas**. Se descarta para esta pantalla la alternativa de collages de pósteres.
- Los iconos son los elementos gráficos principales de las cuatro tarjetas; los contadores se mantienen pequeños y discretos.
- Estilo de iconografía: **A, lineal y minimalista**, sin placas ni fondos geométricos detrás del símbolo.
- Grosor del trazo: **A, fino**. Debe conservar buena legibilidad y no volverse excesivamente delicado.
- Tamaño: **B, grande**. Los iconos deben destacar dentro de las tarjetas, con espacio libre suficiente y sin competir con el nombre.
- Color de iconos: **A, monocromático**. Los cuatro iconos utilizarán un mismo tono neutro; no habrá un color distinto por sección. El tono exacto se definirá al aprobar la paleta del sistema de diseño.
- Composición interna aprobada: icono grande arriba a la izquierda, contador discreto arriba a la derecha cuando corresponda y nombre de la sección abajo.
- Proporción de las cuatro tarjetas: **A, casi cuadradas y compactas**. Se descarta la alternativa rectangular vertical.
- Tratamiento de superficie de las cuatro tarjetas: **B, fondo transparente con contorno fino**. Se descarta el fondo sólido sutil.
- Radio de las esquinas: **A, redondeo sutil de 14 px**. Se descarta el redondeo amplio de 26 px.
- Separación entre las cuatro tarjetas: **A, compacta, 12 px**. Se descarta la alternativa amplia de 20 px.
- Espacio interior de las cuatro tarjetas: **A, compacto, 16 px** entre el contenido y el contorno.
- La pantalla comienza directamente con los cinco accesos: no debe mostrar «PRISMA», un título repetido «Personal» ni un eslogan/subtítulo como «Tu historia como espectador».
- Historial, Pendientes y Ocultos muestran un contador discreto de películas; Historial cuenta películas únicas, no visionados.
- Gestionar listas muestra un contador discreto de listas personalizadas. Estadísticas no muestra contador en el centro de navegación.
- Las tarjetas mantienen el título del acceso y el contador cuando corresponda; no necesitan frases descriptivas largas.
- La aprobación cubre la distribución y estas decisiones parciales de las tarjetas, no el aspecto final: la pantalla sigue en borrador hasta definir y aprobar el sistema visual completo, tipografía, paleta, espaciado y detalles de los componentes.
- Siguen pendientes los tonos exactos de la paleta, tipografías, dimensiones definitivas, valores exactos de grosor de trazo, fondos generales y demás componentes del sistema visual.

### Navegación y Descubrir

- Descubrir es la sección inicial.
- Barra/búsqueda en la parte superior, con accesos a filtros y Ajustes.
- Feed debajo del buscador.
- Píldora flotante inferior, separada de los bordes, con Personal y Descubrir.
- Feed predeterminado de tres columnas.
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

Todavía no hay un sistema de diseño completo aprobado. Las decisiones de Personal indicadas arriba son parciales: por ejemplo, ya está decidido que los iconos sean lineales, grandes y monocromáticos en un tono neutro, pero no se ha elegido el valor exacto de ese color. No se debe inferir una paleta oscura definitiva solo porque se haya pedido un tono cinematográfico para ciertos elementos.

## Decisiones de concepto pendientes de aprobación

- Para la entrada a Personal se eligió el **concepto A**: una pantalla principal con cinco accesos. La distribución aprobada es una cuadrícula de dos columnas para Historial, Pendientes, Ocultos y Estadísticas, más Gestionar listas en una fila de ancho completo. El aspecto final de la pantalla sigue pendiente de aprobación; no implementar hasta cerrar el diseño.

## Registro de aprobaciones visuales

| Elemento | Estado | Versión de implementación |
|---|---|---|
| Sistema de diseño | Pendiente de concepto y aprobación | Por definir |
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
