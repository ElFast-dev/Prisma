# Diseño: automatización y copia única del Laboratorio

## Flujo
1. La navegación a Laboratorio llama a `ensureLabMetrics()`; el coordinador existente agrupa llamadas concurrentes y cachea por la clave de datos.
2. La fase Ridge usa `includeExtendedAlphaGrid: true` e `includeRelativeScale: true`. El resto de fases continúa en el mismo coordinador.
3. Tras completar la batería, `ensureLabMetrics()` consulta el snapshot y llama a `retryFailures()` como máximo una vez por invocación automática si hay estados `error` o `cancelled`. La promesa de orquestación debe compartirse entre renders concurrentes. Estados `unavailable` son finales esperados y no provocan reintento.
4. La vista muestra estado global, fase actual, barra de progreso, fase completada/total, tiempo estimado y una sola acción de copia. No presenta resultados de gustos ni acciones de ejecutar pruebas concretas.
5. La copia solicita JSON completo con `includeFeatureLabels=false`. Se genera en memoria local; no se usa red ni persistencia adicional. Si falla el portapapeles, se muestra un textarea de respaldo.
6. Si cambia el perfil/datos de entrada, se invalida la generación anterior y se limpia el mensaje/informe preparado para no atribuirlo a otra muestra.

## Cambios de arquitectura
- Mantener la separación existente entre coordinador, evaluadores, acciones y renderizador.
- Retirar de la composición visible las vistas dedicadas a controles manuales Ridge y temporal que dejan de tener punto de entrada en el Laboratorio.
- Mantener los módulos de evaluación y las acciones de TMDB en Ajustes/Datos.
- Incrementar las versiones coordinadas de módulos y caché PWA.

## Riesgos y mitigaciones
- La evaluación Ridge ampliada tarda más: el progreso sigue siendo cooperativo, la fase refleja el nuevo trabajo y la estimación usa mediciones observadas.
- Fallos parciales: se reintentan únicamente fases error/canceladas una vez; luego se puede copiar el informe con estados finales claramente registrados.
- Clipboard sin permiso: fallback de texto seleccionable.
- Privacidad: el único informe visible/copiado es JSON con etiquetas de señales desactivadas; la generación no hace peticiones de red.
- Activación del portapapeles: cuando el diagnóstico ya está completo se usa el objeto de métricas cacheado, evitando un await innecesario antes de invocar `clipboard.writeText`.
