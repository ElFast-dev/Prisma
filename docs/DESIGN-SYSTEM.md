# Sistema visual de Prisma

## Dirección artística

Oscuro, cinematográfico, elegante y minimalista. Las carátulas son protagonistas; los controles y metadatos deben ocupar solo el espacio necesario.

## Paleta

| Token | Valor |
|---|---|
| Fondo | #0E1117 |
| Superficie | #171D26 |
| Tarjeta | #222B37 |
| Activo | #303B49 |
| Borde | #35404D |
| Texto | #F1EEE8 |
| Texto secundario | #AEB7C3 |
| Acento | #D9BD91 |
| Éxito | #81A88D |
| Advertencia | #D6AF70 |
| Error | #CA8181 |

Los tokens se centralizan en src/styles/tokens.css.

## Tipografía

Pila del sistema para evitar dependencias de fuentes externas y mejorar el modo offline.

## Espaciado

Múltiplos de 4 px: 4, 8, 12, 16, 20, 24 y 32.

## Radios

8 px para elementos pequeños, 12 px para controles, 16 px para tarjetas, 24 px para paneles y circular para avatares.

## Carátulas

- Descubrir: dos columnas, solo póster.
- Biblioteca: cuadrícula o lista.
- Colecciones: cuadrícula.
- Historial: miniatura e información de experiencia.
- Ficha: carátula completa.
- Recomendaciones: carrusel horizontal de carátulas.

## Redacción y jerarquía de interfaz

Esta regla es obligatoria para todas las pantallas nuevas y existentes.

- No usar eslóganes, frases promocionales, subtítulos de marca, etiquetas decorativas tipo *kicker* ni banners introductorios genéricos.
- No añadir párrafos que anuncien lo que la pantalla ya muestra. Evitar fórmulas como «Tu cine, en datos», «Un vistazo a tu historia», «Diferentes perspectivas…» o «Un recorrido visual…».
- Usar un título funcional y directo solo cuando ayude a identificar la pantalla. No duplicar el nombre de la sección en varios encabezados.
- Mostrar primero los datos, controles y acciones. Eliminar títulos, descripciones y etiquetas que repitan información visible en otra parte.
- El texto explicativo se reserva para aclarar una métrica, una decisión, un control, un estado vacío, un límite de datos, la privacidad, un error o una acción necesaria.
- Las etiquetas deben nombrar con precisión el dato o la acción. No describir con adjetivos vacíos ni usar texto para rellenar espacio.
- Los estados de carga y progreso deben informar qué proceso ocurre o qué elemento se está tratando; no deben convertirse en mensajes promocionales.

Antes de integrar una pantalla, revisar y retirar cualquier texto que no ayude a comprender los datos o completar una tarea.

## Navegación adaptable

- Móvil: navegación principal inferior con Personal, Descubrir y Espectro.
- Pantallas de 900 px o más: rail lateral con los mismos tres destinos y sus iconos.
- Las rutas secundarias no muestran la navegación principal.

## Interacción

Controles táctiles amplios, estados de foco visibles, reducción de movimiento y confirmación de operaciones importantes. Las pestañas horizontales admiten flechas izquierda/derecha, Home y End, con foco itinerante.
