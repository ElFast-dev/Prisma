## ADDED Requirements

### Requirement: Progreso global del diagnóstico automático
El Laboratorio DEBE iniciar automáticamente la batería coordinada al entrar y mostrar siete fases, sus estados, porcentaje global, número de fases finalizadas, tiempo transcurrido y tiempo restante estimado. El progreso DEBE derivarse de unidades de trabajo notificadas por los evaluadores; la ETA DEBE derivarse de duraciones observadas y mostrar «Calculando estimación…» cuando todavía no existan mediciones suficientes.

#### Scenario: Primera ejecución del Laboratorio
- DADO que la persona entra en el Laboratorio con un perfil sin historial de tiempos
- CUANDO comienza la batería
- ENTONCES las siete fases muestran su estado real, el porcentaje sigue el trabajo informado y la ETA muestra «Calculando estimación…» hasta disponer de mediciones suficientes.

#### Scenario: Fase no disponible
- DADO que una fase no alcanza sus requisitos mínimos de muestra
- CUANDO el coordinador evalúa la fase
- ENTONCES la fase termina como «No disponible» con una causa y la batería continúa con las demás fases independientes.

### Requirement: Copia de diagnóstico integral
El Laboratorio DEBE mantener deshabilitado el botón «Copiar diagnóstico completo para la IA desarrolladora» hasta que todas las fases estén en estado final; los estados no disponibles son finales válidos y los errores permiten copiar un informe parcial claramente identificado y reintentar solo las fases fallidas.

#### Scenario: Diagnóstico completo listo
- DADO que cada fase está completada, no disponible, cancelada o en error
- CUANDO la persona solicita copiar el diagnóstico
- ENTONCES se construye un único documento JSON local que incorpora estados, duraciones, cobertura, resultados y limitaciones de todas las fases.

#### Scenario: Una fase falla
- DADO que una fase falla pero las demás han terminado
- CUANDO la persona copia el informe parcial y luego reintenta
- ENTONCES el informe identifica el error y el siguiente intento conserva los resultados válidos y reejecuta solo las fases fallidas.

### Requirement: Continuidad de interfaz
El Laboratorio DEBE ceder el control al navegador durante los cálculos intensivos y DEBE descartar los resultados cuando cambie la generación de datos evaluada. Navegar fuera del Laboratorio no DEBE invalidar por sí solo una ejecución local cuyo perfil no haya cambiado.

#### Scenario: Navegación durante la batería
- DADO que una evaluación está en curso
- CUANDO la persona navega a otra sección y después regresa sin alterar los datos
- ENTONCES la interfaz continúa respondiendo y recupera la ejecución válida o sus resultados en caché.

#### Scenario: Cambio del perfil durante una fase
- DADO que la batería calcula resultados para una versión concreta del historial y metadatos
- CUANDO cambia alguna fuente de datos que interviene en el diagnóstico
- ENTONCES los resultados de la generación anterior no se publican como resultados del perfil nuevo.
