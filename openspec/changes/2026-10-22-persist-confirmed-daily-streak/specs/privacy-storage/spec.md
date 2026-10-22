# Requisitos delta: persistencia local de la racha

## ADDED Requirements

### Requirement: Racha confirmada en el estado del perfil

Prisma DEBE persistir la racha confirmada en el estado local y en la copia de seguridad. Solo el importador del archivo reconocido puede establecerla automáticamente; un perfil vacío no la mostrará.

#### Scenario: Restaurar el perfil

- DADO que una copia de Prisma incluye una racha confirmada válida
- CUANDO se restaura la copia
- ENTONCES vuelve a aparecer el mismo intervalo, sin duplicar películas ni filas de historial

#### Scenario: No transmitir la racha

- DADO que el perfil contiene el calendario de racha
- CUANDO Prisma la presenta en Progreso
- ENTONCES los cálculos se ejecutan localmente y no se transmite el registro por red
