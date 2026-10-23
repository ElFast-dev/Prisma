# Requisitos delta: modularidad de la vista de racha

## ADDED Requirements

### Requirement: Renderizador de calendario de racha aislado

Prisma DEBE mantener el marcado del calendario de la racha en un módulo de vista independiente con dependencias de datos y escape inyectadas. La composición de páginas DEBE conservar su interfaz pública y el resultado visual/accesible del calendario, con una celda por cada día confirmado, cuadrículas mensuales correctamente alineadas y solo el último mes abierto por defecto.

#### Scenario: Compatibilidad de la vista de Progreso

- DADO un estado con una racha personal confirmada de 280 días
- CUANDO el calendario se renderiza a través de `createPageViews` o de `createWatchStreakView`
- ENTONCES ambos renderizados producen el mismo marcado, conservan 280 marcadores de fecha, diez secciones mensuales y un único mes abierto

#### Scenario: Aislamiento del renderizador

- DADO el módulo `js/ui/watch-streak-view.js`
- CUANDO el validador de arquitectura inspecciona sus imports y código
- ENTONCES puede cargar su fábrica y verificar que no accede al DOM ni al almacenamiento directamente
