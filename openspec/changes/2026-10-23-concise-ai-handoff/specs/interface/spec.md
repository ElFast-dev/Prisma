## ADDED Requirements

### Requirement: Copia principal como contexto técnico compacto
El Laboratorio DEBE ofrecer como acción principal una copia Markdown concisa preparada para que una IA desarrolladora continúe el trabajo. El resumen DEBE contener el enlace al repositorio, reglas críticas que no deben romperse, estado y tamaño de muestra, hallazgos cuantitativos relevantes, límites de interpretación y la siguiente tarea recomendada. DEBE omitir arrays repetitivos y detalles internos que no cambien la decisión técnica.

#### Scenario: Copiar contexto después de completar el diagnóstico
- DADO que las siete fases del Laboratorio alcanzaron un estado final
- CUANDO la persona pulsa «Copiar contexto resumido para IA»
- ENTONCES Prisma copia una ficha Markdown con el contexto indispensable y las conclusiones accionables, sin copiar el JSON completo.

#### Scenario: Experimentos con resultados diferentes
- DADO que un experimento mejora MAE pero empeora nDCG@5 en un modo principal
- CUANDO se construye el resumen
- ENTONCES Prisma conserva esa diferencia explícitamente y no recomienda cambiar el modelo de producción basándose solo en MAE.

#### Scenario: Fase no disponible o con error
- DADO que una fase acaba no disponible, cancelada o con error
- CUANDO se prepara el contexto
- ENTONCES su estado se identifica con la causa disponible y el resultado ausente no se presenta como cero ni como experimento exitoso.

### Requirement: Privacidad del contexto compartible
El resumen compacto DEBE generarse localmente y NO DEBE incluir títulos de películas, identificadores, notas individuales, fechas personales, comentarios libres ni nombres individuales de señales cinematográficas. El formateador NO DEBE transmitir ni guardar el resumen automáticamente y NO DEBE invocar servicios remotos para generarlo.

#### Scenario: Perfil con etiquetas de características
- DADO que el JSON agregado contiene nombres de temas, personas u otras señales
- CUANDO la persona copia el contexto compacto
- ENTONCES esos nombres concretos quedan excluidos incluso si se habilitó la opción de etiquetas del JSON completo en una acción anterior.

#### Scenario: Generación sin red
- DADO un diagnóstico local final
- CUANDO se genera y copia el contexto resumido
- ENTONCES Prisma formatea el objeto agregado en el dispositivo sin enviar solicitudes de red ni persistir otra copia.

### Requirement: JSON integral como opción avanzada
El Laboratorio DEBE mantener disponible una acción secundaria para copiar el JSON técnico integral. La inclusión de hasta 40 nombres agregados de señales DEBE requerir una opción explícita y DEBE aplicar solo al JSON integral, no al contexto compacto.

#### Scenario: Revisión detallada
- DADO que la persona necesita inspeccionar estructuras y métricas detalladas
- CUANDO pulsa «Copiar JSON técnico completo»
- ENTONCES Prisma copia el esquema de diagnóstico existente sin sustituirlo por el resumen Markdown.

#### Scenario: Cambio desde JSON completo a resumen
- DADO que antes se copió un JSON con inclusión explícita de señales
- CUANDO la persona copia después el contexto resumido
- ENTONCES el resumen sigue excluyendo nombres individuales de señales y su opción de etiquetas aparece desmarcada o inactiva.
