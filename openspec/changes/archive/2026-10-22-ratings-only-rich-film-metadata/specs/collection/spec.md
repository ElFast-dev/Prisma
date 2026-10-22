## MODIFIED Requirements

### Requirement: Calificación personal solo numérica

El panel Calificar DEBE permitir escoger una nota entera del 1 al 10 y guardarla sin otros campos obligatorios u opcionales de emociones, recuerdos o comentarios. Los campos heredados PUEDEN conservarse por compatibilidad, pero NO DEBEN mostrarse como preguntas ni usarse para recomendaciones.

#### Scenario: Calificación rápida

- DADO que la persona abre Calificar en una película
- CUANDO escoge una nota entre 1 y 10 y pulsa Guardar nota
- ENTONCES Prisma guarda la nota y los metadatos disponibles sin solicitar campos adicionales

#### Scenario: Editar una valoración antigua

- DADO que una valoración importada contiene emociones o nota libre antiguas
- CUANDO la persona edita solo su puntuación
- ENTONCES la interfaz no solicita ni muestra esos campos y Prisma los ignora al recomendar