# Diseño técnico

## Arquitectura
`js/diagnostics/lab-diagnostic-coordinator.js` es la autoridad única del ciclo de vida: siete fases declaradas, estados, pesos de trabajo, tiempos, ETA, caché, invalidación por generación y reintento selectivo. `js/app/lab-metrics-actions.js` conecta los evaluadores existentes y construye el estado de presentación; no vuelve a implementar sus algoritmos. `js/ui/lab-views.js` representa el progreso y el informe. `js/diagnostics/recommendation-report.js` añade los agregados en un esquema versionado.

## Ejecución no bloqueante
El ranking y normalización notifican avance por lote/pliegue. Ridge añade `buildKernelAsync` y `trainRidgeAsync`, cediendo el control durante la construcción de la matriz, centrado y solución de Cholesky. La evaluación temporal usa esos ajustes cooperativos. Las llamadas reciben predicados de continuación y resultados de una generación obsoleta se descartan.

## Fases y dependencias
A produce cobertura y perfil en memoria. B calcula la línea base heurística. C mide nDCG@5 y diversidad. D ejecuta las variantes de normalización con las mismas particiones. E ejecuta Ridge anidado, cinco pliegues externos, tres internos y tres repeticiones. F usa el evaluador temporal existente con el proxy de fecha añadida forzado a falso. G usa motores aislados para géneros; géneros+etiquetas; géneros+etiquetas+sinopsis; y el conjunto actual completo.

## Privacidad
El coordinador mantiene los objetos del perfil en memoria para los evaluadores, pero las instantáneas públicas omiten resultados internos. El informe convierte la batería a estados, tiempos y métricas agregadas mediante listas de campos permitidos. La etiqueta de cada señal solo aparece si la opción de inclusión explícita está activada. No se realiza ninguna llamada de red desde el código diagnóstico.

## Caché, fallos y navegación
La batería comparte una promesa por clave de datos; las ejecuciones válidas finalizadas se guardan en caché en memoria. Los cambios invalidan la generación, y la vista conserva una ejecución válida al navegar fuera del Laboratorio. Las fases fallidas se pueden reintentar sin repetir las fases válidas. Los estados no disponibles son resultados explícitos con explicación, no éxitos simulados.

## PWA y despliegue
Se actualizan las URLs con parámetros de versión, se precargan los módulos nuevos en `sw.js` y se incrementa la clave del shell. El despliegue sigue condicionado al flujo existente de capturas Playwright y a verificar el SHA exacto de `main`.

## Riesgos conocidos
La ejecución repetida de Ridge es costosa con historiales grandes; se mitiga con lotes cooperativos, telemetría y ETA empírica. La ETA de una primera ejecución puede no estar disponible hasta medir al menos dos fases. nDCG y las diferencias entre familias son resultados descriptivos del historial retenido, no una prueba de satisfacción futura.
