## ADDED Requirements

### Requirement: Concurrencia segura en GitHub Pages

El flujo de publicación DEBE serializar los despliegues sin permitir que un workflow omitido, fallido o cancelado interrumpa un despliegue aprobado en curso. La compuerta DEBE seguir exigiendo la aprobación de Playwright para el SHA exacto.

#### Scenario: Un evento omitido llega durante una publicación

- DADO que un despliegue aprobado está en curso
- CUANDO un workflow de capturas cancelado inicia el workflow de Pages y su job resulta omitido
- ENTONCES la ejecución omitida no cancela el despliegue aprobado

#### Scenario: Validación del SHA publicado

- DADO que una ejecución de Playwright termina correctamente para un commit de `main`
- CUANDO el workflow publica la aplicación
- ENTONCES descarga el artefacto de aprobación, valida el SHA y despliega ese commit exacto