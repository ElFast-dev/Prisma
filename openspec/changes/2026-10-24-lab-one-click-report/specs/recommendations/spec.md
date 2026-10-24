# Delta de especificación: Laboratorio automático y copia única

## ADDED Requirements

### Requirement: El Laboratorio ejecuta la batería de desarrollo automáticamente

Al entrar en el Laboratorio, Prisma DEBE iniciar o reutilizar la batería local para el perfil de datos vigente. La batería DEBE incluir cobertura, línea base, ranking, normalización, Ridge con rejilla extendida y escala relativa, evaluación temporal y familias de características. La elección de parámetros debe seguir aislada dentro de la validación interna. Estos resultados NO DEBEN activar ni modificar el modelo de producción.

#### Scenario: Apertura del Laboratorio con un perfil disponible

- **WHEN** el usuario entra en Laboratorio
- **THEN** comienza o se reutiliza la batería automática para los datos actuales
- **AND** el usuario no necesita iniciar Ridge, la evaluación temporal ni la normalización mediante acciones separadas
- **AND** la fase Ridge usa la rejilla extendida de 18 valores y la comparación de escala relativa.

#### Scenario: Varias representaciones mientras una batería está activa

- **WHEN** la vista se vuelve a renderizar durante la ejecución
- **THEN** las llamadas concurrentes comparten la misma ejecución y no duplican el experimento.

#### Scenario: Una fase automática falla

- **WHEN** una fase termina con estado error o cancelada y quedan datos vigentes
- **THEN** Prisma reintenta automáticamente esa fase una sola vez
- **AND** no repite fases correctas ni fases no disponibles por falta de muestra
- **AND** si persiste el fallo, permite copiar un informe que conserva el estado parcial.

### Requirement: Una única acción copia un informe técnico privado por defecto

La vista del Laboratorio DEBE presentar una única acción de copia, deshabilitada mientras la batería no haya alcanzado un estado final. La acción DEBE copiar el JSON técnico agregado v14 con los nombres individuales de señales desactivados, generado localmente y sin transmitirlo. Si el portapapeles falla, DEBE ofrecer el informe en texto seleccionable.

#### Scenario: Batería finalizada correctamente o con métricas no disponibles

- **WHEN** todas las fases han alcanzado un estado final, incluyendo posibles resultados unavailable
- **THEN** se habilita la acción única «Copiar informe técnico para desarrollo»
- **AND** al pulsarla se copia el JSON completo del esquema v14
- **AND** el informe indica `featureLabelsIncluded=false` y `networkTransmission=false`.

#### Scenario: Intento de copia durante el cálculo

- **WHEN** existe una fase pendiente o en ejecución
- **THEN** la acción de copia permanece deshabilitada.

#### Scenario: No se puede acceder al portapapeles

- **WHEN** el navegador rechaza o no ofrece `clipboard.writeText`
- **THEN** Prisma muestra el JSON en un control de texto de respaldo.

### Requirement: La vista de Laboratorio evita controles y gráficos que no ayudan al flujo de desarrollo

El Laboratorio DEBE limitar la interfaz a estado y progreso de la batería, una nota de privacidad y la acción única de copia. No DEBE mostrar gráficos de gustos, métricas de perfil duplicadas, controles manuales de ejecución, reintentos manuales, reinicio manual ni opciones para incluir nombres de señales. Las funciones de enriquecimiento TMDB DEBEN seguir disponibles desde Ajustes/Datos.

#### Scenario: Laboratorio abierto

- **WHEN** se muestra la pantalla Laboratorio
- **THEN** solo se muestra el progreso/estado necesario y una acción de copia
- **AND** la sincronización de TMDB permanece accesible fuera del Laboratorio
- **AND** los datos personales permanecen en el dispositivo.
