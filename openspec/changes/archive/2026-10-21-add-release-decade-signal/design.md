# Diseño: señal de década y evaluación por ablación

## Evidencia y decisión de producto

El catálogo ya normaliza `year` y las respuestas de TMDB incluyen `release_date`; por tanto, esta mejora puede ser local y no necesita enriquecer el catálogo con solicitudes nuevas. La literatura sobre recomendación describe tanto el valor de las señales de contenido como los riesgos de señales auxiliares y sesgos; además, hay estudios de recomendación de películas que exploran factores temporales. Son motivaciones para probar una hipótesis, no evidencia de que una década mejore necesariamente el gusto de cada usuario.

Referencias de contexto:
- [TMDB: Search and Query for Details](https://developer.themoviedb.org/docs/search-and-query-for-details), ejemplo oficial del campo `release_date`.
- [Collaborative Filtering with Temporal Features for Movie Recommendation System](https://doi.org/10.1016/j.procs.2023.01.115), estudio sobre efectos temporales en recomendación de películas (modelo distinto al de Prisma, por lo que no se extrapola como garantía).
- [scikit-learn: Data leakage](https://scikit-learn.org/stable/common_pitfalls.html#data-leakage), referencia sobre aprender únicamente con el conjunto de entrenamiento durante la evaluación.

## Decisiones técnicas

- En `features.js`, usar el año de la entrada personal si es un año explícito válido; en caso contrario, recurrir al registro de catálogo y a su fecha de estreno. La fecha de visionado no se utiliza.
- Aceptar años enteros plausibles entre 1888 y 2100. Derivar la década con `Math.floor(year / 10) * 10` y emitir `década: 2010`; año desconocido o inválido no genera señal.
- Multiplicadores directos: género 1,0; etiqueta 0,35; década 0,20. La señal temporal cuenta como una característica disponible, pero la regla de confianza sigue exigiendo varias coincidencias, cobertura y respaldo de historial.
- No cambiar la regularización del perfil ni los datos personales. La década solo aporta una contribución más a la suma actual, normalizada por el número total de características candidatas.
- En cada pliegue leave-one-out, calcular la predicción normal y otra con la década excluida tanto al construir el perfil como al predecir la muestra retenida. Devolver el MAE de ambas variantes y `decadeImprovement = maeWithoutDecade - mae`; positivo significa menor error con la señal.
- Comparar ambas variantes sobre las mismas películas retenidas. No usar estos resultados para autoajustar el modelo. Solo exponer el efecto de la década cuando al menos cinco de las muestras evaluadas tienen año válido; si no, indicar que los datos son insuficientes.
- La referencia de media permanece sin cambios. El MAE es una medida experimental de predicción de notas, no una garantía de satisfacción ni una métrica completa de ranking.
- Mantener el proyecto sin dependencias y subir la versión de caché del service worker para que la PWA reciba el nuevo módulo.
