# Propuesta: identidad inequívoca de películas y procedencia de fechas

## Motivación

Prisma puede recibir el mismo título desde datos importados, historial, catálogo local y TMDB. La identidad basada únicamente en el título puede fusionar remakes o representar la misma película dos veces cuando un registro legado no tiene ID TMDB. Además, guardar una valoración genera un instante de acción que no necesariamente es la fecha en que se vio la película.

## Alcance

- Priorizar el ID TMDB válido como identidad.
- Usar el título normalizado y el año disponible como fallback; no fusionar años contradictorios.
- Reconciliar registros sin ID solo cuando la posible correspondencia sea única y no contradiga años conocidos.
- Aplicar las mismas reglas a catálogo combinado, historial, acciones, importaciones JSON/CSV y candidatas de Descubrir.
- Ocultar las marcas `action-time` como fecha de visionado y marcar como confirmada la fecha creada por la acción explícita «Marcar como vista».
- Añadir pruebas sintéticas y actualizar versionado PWA/compuertas de CI.

## Fuera del alcance

- Eliminar o modificar automáticamente datos personales ya guardados.
- Inventar años o IDs TMDB para resolver registros ambiguos.
- Cambiar el modelo de recomendación o enviar datos personales a un servidor.

## Criterios de aceptación

- Los IDs TMDB positivos diferentes nunca se fusionan.
- Las entradas sin ID del mismo título pero con años distintos siguen siendo identidades distintas.
- Un registro legado incompleto solo se asocia a otra identidad si existe una única correspondencia segura.
- Una marca `action-time` no se presenta como fecha de visionado.
- Las fechas confirmadas/importadas explícitamente siguen mostrándose con fecha local de Panamá.
