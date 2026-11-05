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

Todavía no hay colores, tipografías, tamaños, radios, sombras ni iconografía aprobados. No se debe inferir una paleta oscura definitiva solo porque se haya pedido un tono cinematográfico para ciertos elementos.

## Registro de aprobaciones visuales

| Elemento | Estado | Versión de implementación |
|---|---|---|
| Sistema de diseño | Pendiente de concepto y aprobación | Por definir |
| Pantalla Descubrir | Estructura funcional acordada; diseño visual pendiente | Por definir |
| Navegación Personal/Descubrir | Estructura funcional acordada; diseño visual pendiente | Por definir |
| Personal: Historial | Pendiente de concepto y aprobación | Por definir |
| Personal: Pendientes | Pendiente de concepto y aprobación | Por definir |
| Personal: Ocultos | Pendiente de concepto y aprobación | Por definir |
| Personal: Estadísticas | Pendiente de concepto y aprobación | Por definir |
| Personal: Gestionar listas | Estructura funcional acordada; diseño visual pendiente | Por definir |
| Ficha cinematográfica | Estructura funcional detallada; diseño visual pendiente | Por definir |
| Ajustes | Requisitos funcionales; diseño visual pendiente | Por definir |

No se debe implementar el diseño visual de una pantalla mientras su concepto siga pendiente.
