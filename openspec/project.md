# Protocolo SDD de Prisma

## Fuente de verdad

- `openspec/specs/` describe el comportamiento vigente y esperado del producto.
- `openspec/changes/` contiene propuestas y deltas que aún no se han incorporado a la base de especificaciones.
- `openspec/changes/archive/` conserva los expedientes concluidos.
- `docs/` mantiene el contexto general del producto, la arquitectura, el modelo de datos y las decisiones técnicas.

Los documentos de referencia se elaboran a partir del código inspeccionado. Cuando una función no tiene pruebas, se declara esa limitación; una descripción del comportamiento observado no equivale a evidencia automatizada.

## Flujo obligatorio de cada cambio

1. Inspeccionar el código, las pruebas existentes, las rutas de ejecución y el historial relevante.
2. Crear una carpeta de cambio con motivación, alcance, exclusiones y criterios de aceptación.
3. Especificar escenarios observables y los casos límite pertinentes antes de implementar.
4. Definir el diseño técnico mínimo, riesgos, compatibilidad y datos que no deben alterarse.
5. Crear tareas pequeñas en orden de dependencia, vinculadas a requisitos.
6. Implementar solo el alcance aprobado. Si cambia el entendimiento del problema, actualizar los artefactos antes de continuar.
7. Ejecutar las pruebas pertinentes y registrar comandos, resultados y límites. Nunca marcar como verificado lo que no se ejecutó.
8. Revisar regresiones, privacidad y accesibilidad aplicables.
9. Actualizar las especificaciones vigentes y archivar el expediente cuando se hayan cumplido los criterios de cierre.

Para arreglos triviales, el expediente puede ser breve, pero debe incluir causa o hipótesis, criterio de corrección, tarea y evidencia de verificación.

## Modularidad obligatoria

La arquitectura del cliente debe separar dominio, almacenamiento, integraciones, motor, analizadores y presentación en módulos con dependencias explícitas. Los módulos de dominio no deben acoplarse al DOM ni realizar efectos secundarios. Los cambios de arquitectura siguen SDD y agregan pruebas que ejerciten las APIs exportadas.

La migración del código heredado se hace por responsabilidades y no autoriza ampliar el producto hasta completar la separación pendiente de vistas, controladores y TMDB. Cada extracción debe preservar el comportamiento, las rutas relativas de GitHub Pages, los formatos de datos y la caché PWA.

## Formato de especificaciones

Cada archivo spec.md usa los encabezados:

- `## Requirements`
- `### Requirement: nombre observable`
- `#### Scenario: situación verificable`

Los requisitos deben ser normativos y los escenarios deben describir condición y resultado. El contenido puede estar en español, pero los encabezados se mantienen estables para poder validarlos automáticamente.

Para una especificación delta se indica si la capacidad se añade, modifica o elimina usando una sección ADDED, MODIFIED o REMOVED. No copiar en un delta toda la especificación existente si solo cambia una parte.

## Criterios de cierre

Un cambio no se considera terminado si hay criterios obligatorios sin verificar o si la especificación diverge del comportamiento aceptado. Si un check no puede ejecutarse o una prueba falla, registrar el estado como pendiente, bloqueado o fallido. No usar checks verdes de sintaxis como sustituto de las pruebas de aceptación.

## Reglas de datos y seguridad

- Nunca incluir historial personal, notas, credenciales TMDB o respaldos reales en el repositorio, issues, ejemplos o CI.
- Usar únicamente datos sintéticos en pruebas.
- No instalar una dependencia grande ni cambiar la arquitectura sin justificarlo en el diseño.
- No ejecutar llamadas reales a TMDB en los checks ordinarios.
- No modificar funciones ajenas al alcance aprobado.
