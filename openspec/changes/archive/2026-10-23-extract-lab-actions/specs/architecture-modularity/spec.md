# Requisitos delta: acciones del Laboratorio

## Requirements

### Requirement: Orquestación aislada de acciones del Laboratorio

Prisma DEBE mantener la coordinación de los experimentos del Laboratorio fuera de app.js, mediante un módulo con dependencias inyectadas, sin duplicar ni alterar la implementación del recomendador o sus protocolos experimentales.

#### Scenario: Ejecución de un experimento a petición

- DADO que la persona inicia desde el Laboratorio la evaluación Ridge, temporal o de normalización
- CUANDO el módulo coordina la ejecución
- ENTONCES conserva los estados ocupado/progreso, los avisos de resultado y las guardas contra ejecuciones incompatibles sin modificar el ranking de producción

#### Scenario: Cancelación y datos cambiantes

- DADO que una acción deja de ser la ejecución vigente porque cambia el estado personal
- CUANDO el evaluador notifica progreso o devuelve un resultado
- ENTONCES la acción no sobrescribe el estado más reciente con resultados obsoletos

### Requirement: Informe diagnóstico bajo control local

Prisma DEBE generar y preparar el informe diagnóstico solo a partir de la acción explícita de la persona, manteniendo el contenido local hasta que esta decida copiarlo y preservando un camino de copia manual si el portapapeles falla.

#### Scenario: Copia explícita del informe

- DADO que la persona activa copiar el informe del Laboratorio
- CUANDO la acción construye las métricas agregadas
- ENTONCES invoca el portapapeles desde esa interacción, no transmite el informe a un servidor y deja el texto disponible para revisión/copia manual ante un fallo

#### Scenario: Sin cambios en el algoritmo

- DADO que las acciones del Laboratorio se ejecutan con perfil y datos disponibles
- CUANDO se extrae su orquestación a un módulo
- ENTONCES las funciones, los pesos, los candidatos y el protocolo de evaluación actuales permanecen inalterados
