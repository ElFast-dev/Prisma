# Requisitos delta: claves de género canónicas

## ADDED Requirements

### Requirement: Claves de género consistentes entre fuentes

Prisma DEBE normalizar los alias de género con la misma función canónica al construir el perfil de valoraciones y al puntuar candidatas. La clave DEBE ser independiente de mayúsculas/minúsculas, diacríticos y alias conocidos de localización. La normalización NO DEBE cambiar la identidad de la película ni mezclar géneros distintos.

#### Scenario: Historial inglés y candidata en español

- DADO que una valoración contiene el género `science fiction` y una candidata contiene `Ciencia ficción`
- CUANDO Prisma extrae características para perfil y candidata
- ENTONCES ambas producen la clave `género: ciencia ficción` y pueden coincidir

#### Scenario: Alias de un mismo género

- DADO que los datos mezclan `sci-fi`, `sci fi`, `ciencia ficción` y `ciencia ficcion`
- CUANDO se construyen las características
- ENTONCES todos los alias conocidos generan una sola señal canónica

#### Scenario: Ausencia de duplicados

- DADO que una fuente incluye repetidamente el mismo género mediante varios alias
- CUANDO Prisma normaliza el catálogo y las características
- ENTONCES conserva solo una característica de género canónica
