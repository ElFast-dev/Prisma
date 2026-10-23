# Requisitos delta: calendario compacto de Progreso

## MODIFIED Requirements

### Requirement: Racha diaria confirmada independiente de los títulos guardados

El calendario DEBE mostrar un único marcador por cada una de las 280 fechas confirmadas, abrir inicialmente solo el mes final y dejar los meses anteriores plegados. Los números del calendario DEBEN alinearse con los días reales de la semana; los días de contexto fuera de la racha NO DEBEN recibir un marcador ni sumarse al total.

#### Scenario: Vista inicial compacta

- DADO que la racha confirmada abarca de enero a octubre
- CUANDO se abre Progreso
- ENTONCES solo se despliega octubre de 2026 y las demás vistas mensuales permanecen plegadas, conservando acceso a todas las fechas
