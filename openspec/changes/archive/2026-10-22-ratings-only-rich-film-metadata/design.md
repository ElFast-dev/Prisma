# Diseño técnico: notas y metadatos ricos

## Flujo principal

1. La persona busca el título que vio y abre su ficha con identidad TMDB.
2. La ficha carga detalles cinematográficos, palabras clave y créditos cuando hay credencial y conexión.
3. La persona elige una nota entera del 1 al 10; no se solicitan emociones ni texto libre.
4. La normalización expone campos existentes de TMDB a `movieFeatures`.
5. El motor forma un perfil desde desviaciones de las notas, usando un prior neutral de 6.5 con fuerza equivalente a tres observaciones iniciales.
6. Descubrir puede enriquecer seis candidatas populares por página, con hasta dos peticiones concurrentes. Los resultados remotos se mantienen en memoria y no se añaden automáticamente al perfil.
7. El ranking excluye identidades que ya están valoradas, vistas, pendientes u ocultas; las explicaciones citan solo señales efectivamente presentes.

## Familias de características

| Familia | Ejemplo de señal | Peso relativo inicial |
| --- | --- | ---: |
| Género | `género: misterio` | 1.00 |
| Palabra clave | `tema: bucle temporal` | 0.35 |
| Dirección | `director: nombre` | 0.45 |
| Saga | `saga: nombre` | 0.40 |
| Reparto | `actor: nombre` | 0.28 |
| Guion | `guionista: nombre` | 0.30 |
| Música | `compositor: nombre` | 0.18 |
| Productora | `productora: nombre` | 0.14 |
| Sinopsis | `trama: término` | 0.12 |
| País de producción | `país: nombre` | 0.12 |
| Duración | `duración: larga` | 0.12 |
| Idioma original | `idioma original: en` | 0.10 |
| Idioma hablado | `idioma hablado: english` | 0.08 |
| Década fiable | `década: 2020` | 0.20 |

Son ponderaciones heurísticas iniciales, no parámetros probados como óptimos. No se deben ajustar automáticamente solo para mejorar los resultados de las películas de entrenamiento. Las métricas del laboratorio seguirán usando muestras y particiones comparables.

## Compatibilidad y privacidad

Los campos `emotions` y `note` de exportaciones antiguas pueden conservarse al actualizar valoraciones existentes para no perder datos. La interfaz nueva no los muestra y el recomendador no los consulta. Las notas, el catálogo personalizado y las credenciales permanecen en el navegador; TMDB se consulta directamente desde el cliente. Los diagnósticos compartibles continúan agregados y bajo acción explícita.

## Riesgos y mitigaciones

- Metadatos incompletos: no inventar valores, reducir cobertura/confianza y explicar la limitación.
- Títulos repetidos: preferir ID TMDB exacto al resolver o guardar una nota.
- Sobreajuste a sinopsis: limitar el número de términos y usar peso bajo.
- Primera valoración extrema: usar prior suavizado y no declarar confianza alta con una sola película.
- Consumo de red: limitar y cachear el enriquecimiento en memoria, con concurrencia baja y manejo tolerante de fallos.