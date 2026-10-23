# Requisitos delta: omitir despliegues obsoletos

## MODIFIED Requirements

### Requirement: Publicación bloqueada por las pruebas de la misma versión

GitHub Pages DEBE publicar únicamente el SHA aprobado por calidad y Playwright cuando ese SHA continúe siendo el head actual de `main). El workflow DEBE comprobar el head de `main` al validar la aprobación y volver a comprobarlo inmediatamente antes de publicar. Si la referencia actual no se puede resolver o el SHA aprobado ha quedado obsoleto, el workflow DEBE fallar de forma segura o saltar el despliegue; NUNCA DEBE publicar una versión más antigua por el orden de finalización de workflows.

#### Scenario: La aprobación queda obsoleta antes del deploy

- DADO que un commit pasó calidad y Playwright, pero `main` avanzó a otro SHA antes de procesar su aprobación
- CUANDO el workflow de Pages valida el SHA aprobado
- ENTONCES omite la preparación y el despliegue de ese commit antiguo

#### Scenario: Main avanza mientras se prepara Pages

- DADO que el SHA aprobado coincidía con `main` al inicio del deploy
- CUANDO `main` cambia durante la preparación del artefacto estático
- ENTONCES la comprobación inmediatamente anterior a publicar detecta la diferencia y omite el despliegue

#### Scenario: No se puede resolver el head actual

- DADO que GitHub no devuelve un SHA válido para `refs/heads/main`
- CUANDO el gate intenta comparar la aprobación
- ENTONCES falla de forma segura y no publica una versión sin verificar
