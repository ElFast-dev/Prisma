## ADDED Requirements

### Requirement: Puntuación consciente del tipo de señal y su cobertura

Prisma DEBE ponderar con mayor influencia directa los géneros que las etiquetas/keywords poco respaldadas al calcular una estimación. Las características de la candidata que todavía no tienen evidencia en el perfil DEBEN reducir proporcionalmente la corrección respecto a la nota media, no inventar una preferencia. La explicación DEBE reflejar las contribuciones efectivas y la confianza DEBE tener en cuenta la cobertura de características y el soporte del historial.

#### Scenario: Género y etiqueta apuntan en sentidos opuestos

- DADO un perfil donde el peso aprendido de un género es positivo y el peso aprendido de una etiqueta es negativo con magnitudes equivalentes
- CUANDO se predice una película con ambas señales
- ENTONCES la señal de género tiene mayor influencia directa en la nota estimada

#### Scenario: Una parte de los metadatos no se conoce

- DADO una película con varias características y solo una señal con peso aprendido
- CUANDO se calcula su estimación
- ENTONCES las características sin evidencia reducen la corrección respecto a la nota media del perfil

#### Scenario: Cobertura baja de las señales

- DADO un perfil amplio pero una película candidata con una única coincidencia y muchas características desconocidas
- CUANDO se predice su nota
- ENTONCES no se declara confianza moderada ni se describen las características desconocidas como preferencias

#### Scenario: Varias señales con respaldo

- DADO una película cuyas señales aprendidas cubren la mayoría de sus características y hay coincidencias repetidas en el historial
- CUANDO se calcula la predicción
- ENTONCES la confianza puede ser moderada y la explicación muestra contribuciones relevantes

#### Scenario: Nota predicha extrema

- DADO que las señales aprendidas producirían una puntuación fuera del rango permitido
- CUANDO Prisma calcula la nota estimada
- ENTONCES la limita al rango de 1 a 10
