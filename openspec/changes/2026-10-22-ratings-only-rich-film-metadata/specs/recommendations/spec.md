## ADDED Requirements

### Requirement: Recomendaciones a partir de notas y datos cinematográficos sin emociones

Prisma DEBE aprender a partir de notas personales del 1 al 10 y de características cinematográficas disponibles. NO DEBE solicitar ni usar emociones, sentimientos, análisis de sentimientos o comentarios personales como señales de recomendación.

#### Scenario: Primera nota alta

- DADO un perfil vacío y una primera película con nota 10 y metadatos vinculados
- CUANDO Prisma construye el perfil y puntúa candidatas
- ENTONCES las características compartidas aportan señales positivas con confianza limitada y nota base suavizada

#### Scenario: Primera nota baja

- DADO un perfil vacío y una primera película con nota 1 y metadatos vinculados
- CUANDO Prisma construye el perfil y puntúa candidatas
- ENTONCES sus características aportan señales negativas frente a candidatas sin esas coincidencias

#### Scenario: Metadatos adicionales disponibles

- DADO que TMDB proporciona género, palabras clave, sinopsis, créditos y detalles técnicos
- CUANDO Prisma normaliza la ficha
- ENTONCES utiliza solo campos recibidos y omite metadatos ausentes

#### Scenario: Campos personales heredados

- DADO que un registro antiguo contiene `emotions` o `note`
- CUANDO se construye el perfil o se predice una candidata
- ENTONCES esos campos no crean características ni modifican la puntuación