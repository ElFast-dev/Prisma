## ADDED Requirements

### Requirement: Apertura no bloqueante del Laboratorio

La aplicación DEBE insertar primero el encabezado, los controles principales y un estado accesible del Laboratorio, sin esperar a que terminen la evaluación del MAE, el ranking offline o la diversidad.

#### Scenario: Abrir el Laboratorio con historial grande

- DADO un perfil sintético con al menos 351 valoraciones enlazadas a metadatos
- CUANDO la persona entra al Laboratorio mediante la navegación principal
- ENTONCES el encabezado «Laboratorio» y sus controles quedan visibles antes de finalizar las evaluaciones, el estado indica que hay cálculos en curso y la interfaz puede procesar otras tareas

#### Scenario: Abrir el Laboratorio con perfil vacío

- DADO que no hay valoraciones personales
- CUANDO la persona abre el Laboratorio
- ENTONCES la vista se muestra, los cálculos finalizan de forma controlada y las métricas que no cumplen los mínimos permanecen como no disponibles en vez de indicar un éxito falso

### Requirement: Evaluaciones cooperativas y cancelables en la interfaz

Las evaluaciones automáticas del Laboratorio DEBEN mantener sus fórmulas, particiones y umbrales existentes mientras ceden el hilo principal entre lotes. La aplicación DEBE descartar los resultados obsoletos cuando cambien los datos o se abandone la página.

#### Scenario: Navegar fuera durante una evaluación

- DADO que las métricas automáticas del Laboratorio se están ejecutando
- CUANDO la persona navega a otra página
- ENTONCES el navegador responde a la navegación y ninguna finalización de la ejecución antigua sustituye el HTML de la página activa

#### Scenario: El perfil cambia durante la evaluación

- DADO que una instantánea está en proceso
- CUANDO se actualizan valoraciones o catálogo
- ENTONCES se invalida el trabajo anterior y solo una instantánea de los datos vigentes puede mostrarse como completa

### Requirement: Reutilización y medición de las métricas del Laboratorio

La aplicación DEBE cachear las métricas para los datos vigentes, reutilizar el resultado al generar el diagnóstico agregado y medir la navegación, el primer render y cada evaluación por separado. Los registros de rendimiento NO DEBEN incluir títulos, identificadores, notas individuales ni otros datos personales.

#### Scenario: Copiar el diagnóstico tras completar las métricas

- DADO que se ha completado la instantánea de métricas del Laboratorio
- CUANDO la persona copia el diagnóstico técnico
- ENTONCES el informe reutiliza el perfil y las evaluaciones calculadas, mantiene su contrato agregado y no vuelve a ejecutar el MAE, el ranking ni la diversidad

#### Scenario: Instrumentación sin datos personales

- DADO que una operación del Laboratorio registra su duración
- CUANDO se inspecciona la salida de rendimiento
- ENTONCES solo aparecen el nombre de la operación, duración, recuento agregado y estado, sin valores de películas ni notas individuales
