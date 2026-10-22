# Propuesta: proteger las publicaciones aprobadas de GitHub Pages

## Problema

El workflow de Pages comparte un grupo de concurrencia con `cancel-in-progress: true`. GitHub ejecuta el workflow también cuando una ejecución anterior de Playwright termina cancelada o fallida. Aunque el job de despliegue se omite mediante su condición `if`, el workflow entrante puede cancelar el despliegue aprobado que comparte ese grupo.

## Alcance

- Serializar los despliegues de Pages sin que un workflow omitido cancele al que ya publica.
- Mantener intacta la compuerta: solo una ejecución de Playwright exitosa, originada como `workflow_run` en `main`, puede desplegar.
- Mantener la comprobación y el checkout del SHA exacto contenido en el artefacto de aprobación.
- Añadir una prueba de regresión a la batería de calidad y especificar la conducta en OpenSpec.

## Criterios de aceptación

- Un workflow de publicación omitido no puede cancelar un despliegue activo.
- Los despliegues aprobados quedan serializados.
- La política que exige calidad, Playwright y SHA validado sigue vigente.
- CI detecta una regresión a `cancel-in-progress: true`.