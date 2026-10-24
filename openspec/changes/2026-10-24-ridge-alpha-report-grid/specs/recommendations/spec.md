# Delta de especificación: rejilla Ridge completa en diagnósticos

## ADDED Requirements

### Requirement: El diagnóstico conserva la rejilla Ridge realmente utilizada

El serializador DEBE preservar la rejilla efectiva del evaluador y los conteos correspondientes, admitiendo hasta 32 valores numéricos, finitos y positivos. No DEBE truncar una rejilla válida de 18 valores a los primeros 14. Los conteos serializados DEBEN limitarse a anclajes incluidos en la rejilla recibida.

#### Scenario: Experimento manual con rejilla extendida

- **WHEN** la evaluación manual Ridge utiliza los 18 valores de alpha
- **THEN** el JSON v14 conserva los 18 valores en la comparación de selección y en la comparación de escala relativa
- **AND** conserva los conteos para los anclajes mínimo y máximo que estén presentes en la ejecución
- **AND** el resumen del límite inferior continúa refiriéndose a `1e-7`, el mínimo de la rejilla utilizada.

#### Scenario: Evaluación histórica

- **WHEN** la batería automática o la evaluación temporal usa la rejilla histórica de 14 valores
- **THEN** el diagnóstico conserva esos 14 valores sin añadir otros ni cambiar los resultados.

#### Scenario: Datos inválidos en la rejilla

- **WHEN** la entrada contiene valores no finitos, no numéricos, cero o negativos
- **THEN** esos valores no se serializan como alphas válidos ni se aceptan como anclajes de conteo.

### Requirement: La serialización del diagnóstico no altera producción ni privacidad

El cambio DEBE limitarse a la representación agregada del resultado; no DEBE cambiar el modelo activo, las particiones ni la selección de alpha, ni DEBE incluir datos personales.

#### Scenario: Corrección exclusiva del reporte

- **WHEN** se serializa un resultado Ridge
- **THEN** el único cambio funcional es la representación íntegra de la rejilla y sus conteos válidos
- **AND** `additive-content-baseline` permanece activo y los datos personales siguen locales.
