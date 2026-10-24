# Propuesta: Laboratorio automático con copia en un solo paso

## Problema
El Laboratorio mezcla diagnósticos para desarrollo con tablas, gráficos, controles de experimentos individuales, controles de reintento y dos formatos de copia. El usuario necesita entrar al Laboratorio, dejar que el diagnóstico se ejecute y pulsar un único botón para copiar un informe útil para continuar el desarrollo de Prisma.

## Alcance
- Conservar el disparo automático de la batería al abrir el Laboratorio.
- Ejecutar en la fase Ridge la rejilla extendida de 18 alphas y la comparación de escala relativa, además de las otras fases ya automáticas.
- Reintentar automáticamente una vez las fases terminadas con error o canceladas, sin repetir las que terminaron correctamente ni confundir resultados no disponibles con fallos.
- Reducir la vista a progreso/estado, información mínima de privacidad y una única acción «Copiar resumen técnico para ChatGPT».
- Construir el JSON agregado v14 localmente como entrada interna y copiar solo un resumen Markdown breve con métricas decisivas, limitaciones y siguiente paso accionable.
- Conservar la salida manual visible únicamente si falla el portapapeles.

## Fuera de alcance
- Cambiar el modelo, sus pesos, el ranking de producción o sus recomendaciones.
- Enviar perfiles o informes a la red.
- Usar emociones, comentarios libres o títulos/IDs personales en el informe de desarrollo.
- Eliminar funciones de enriquecimiento TMDB; siguen disponibles en Ajustes/Datos.

## Criterios de aceptación
- Entrar en Laboratorio dispara la batería automática una sola vez por perfil/datos vigentes.
- El botón permanece deshabilitado mientras haya fases en ejecución y se habilita cuando todas alcancen un estado final.
- Una fase con error/cancelación se reintenta automáticamente una vez; si sigue fallando, el informe refleja el resultado parcial.
- El resumen conserva los resultados principales de la batería, incluida la comparación Ridge/escala relativa cuando está disponible, sin volcar arrays de pliegues ni nombres individuales de características.
- La pantalla no muestra gráficos de gustos, paneles experimentales individuales, botones de reinicio/reintento ni controles para incluir nombres.
- Una única acción visible copia Markdown compacto, limitado a menos de 9500 caracteres, listo para pegar en ChatGPT. El JSON integral no se copia en la acción principal y la copia no transmite datos.
- La batería SDD/calidad y los gates Playwright validan la vista y el flujo de copia.
