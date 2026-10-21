# Requisitos delta: géneros de catálogo canónicos

## ADDED Requirements

### Requirement: Normalización canónica de géneros de catálogo

Prisma DEBE normalizar los alias conocidos de género a una etiqueta canónica localizada antes de deduplicarlos y almacenarlos en la representación normalizada del catálogo. La equivalencia DEBE ser insensible a mayúsculas, acentos y separadores comunes, manteniendo separados los géneros sin alias equivalentes conocidos.

#### Scenario: Alias mixtos de TMDB y CSV

- DADO un catálogo con `science fiction`, `SCI-FI`, `Ciencia ficción` y `ciencia ficcion`
- CUANDO se normaliza una película
- ENTONCES el catálogo conserva una única etiqueta `Ciencia ficción`

#### Scenario: Etiquetas de género equivalentes

- DADO que el catálogo contiene `thriller` y `Suspense` como alias del mismo género localizado
- CUANDO se normaliza la película
- ENTONCES ambos valores se presentan como `Suspenso` y solo aparece una vez
