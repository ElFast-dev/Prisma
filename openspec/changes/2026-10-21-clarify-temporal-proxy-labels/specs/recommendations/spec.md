# Requisitos delta: etiquetas del proxy temporal

## ADDED Requirements

### Requirement: Etiquetar la evaluación según la fuente temporal seleccionada

Prisma DEBE rotular los resultados temporales según la fuente usada. Cuando se active el proxy de fecha de incorporación, las etiquetas DEBEN indicar que el orden se basa en la incorporación a la colección y NO DEBEN describir los registros como visionados futuros confirmados.

#### Scenario: Mostrar el modo proxy

- DADO que la evaluación temporal usa addedAt como proxy
- CUANDO se renderizan las métricas y ventanas de prueba
- ENTONCES los textos mencionan la fecha de incorporación, indican que el resultado es exploratorio y no lo describen como cronología real de visionados
