# Interfaz: orientación inicial en Progreso

## ADDED Requirements

### Requirement: Orientación inicial para un perfil sin valoraciones

Cuando el perfil no contiene valoraciones válidas, Prisma DEBE mostrar una guía breve en Progreso que explique cómo empezar a aportar señales al recomendador y proporcione rutas a explorar películas e importar el historial. La guía DEBE desaparecer cuando exista al menos una valoración válida.

#### Scenario: Primera visita sin valoraciones

- DADO que el perfil no tiene valoraciones válidas
- CUANDO se abre la vista Progreso
- ENTONCES aparece una guía breve con acciones para explorar películas e importar historial

#### Scenario: Navegación desde la guía

- DADO que la guía inicial está visible en Progreso
- CUANDO se pulsa «Explorar películas» o «Importar historial»
- ENTONCES se abre Descubrir o Ajustes/Datos, respectivamente

#### Scenario: El perfil ya tiene una valoración

- DADO que el perfil guarda al menos una valoración válida
- CUANDO se abre la vista Progreso
- ENTONCES la guía de primera ejecución no aparece
