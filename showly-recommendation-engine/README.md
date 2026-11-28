# Prisma · motor de recomendaciones para Showly

Motor Kotlin independiente, determinista y ejecutable localmente. Se integra con **Showly para Android** como un feed personalizado de descubrimiento de películas.

> Estado: el motor, el adaptador, el caso de uso Android y el feed `PERSONALIZED` (“Para ti”) están conectados mediante los scripts de integración. La rama fija Showly como submódulo a un commit concreto; los parches se aplican al working tree local del submódulo, sin modificar su repositorio upstream.

## Qué aprende automáticamente

La única señal de gusto personal son las **calificaciones de Trakt que la persona ya registra en Showly**:

- Las puntuaciones altas refuerzan los rasgos compartidos por esas películas.
- Las puntuaciones bajas penalizan los rasgos compartidos por esas películas.
- La nota se interpreta tanto de forma absoluta como relativa a la media personal.
- La fecha original de cada valoración determina cuánto pesa con el paso del tiempo.

A partir de las películas calificadas aprende preferencias por género, dirección, reparto, guion, palabras clave, franquicia, estudio, idioma, país y década, siempre que existan metadatos. Combina esa afinidad con similitud de contenido, calidad comunitaria ajustada por votos, popularidad, novedad y diversidad.

**No hay botones, formularios, encuestas ni acciones adicionales para entrenar al recomendador.** No se pide marcar películas como favoritas ni indicar que no gustan: la calificación existente ya expresa esa opinión. Una película calificada no vuelve a aparecer entre las recomendaciones.

El motor no necesita conexión de red, no llama a un modelo remoto y no envía las calificaciones a ningún servidor. Showly conserva su sincronización habitual de Trakt; el cálculo del ranking se realiza en el dispositivo.

## Integración Android actual

El feed se incorpora a la pantalla de descubrimiento de películas de Showly:

- `PersonalizedMoviesCase` lee las últimas 100 calificaciones de `MoviesRatingsRepository`.
- Une los IDs de Trakt con las películas locales de Room y usa `MovieDetailsRepository` como fallback limitado para registros que falten.
- Enriquece las películas con géneros, idioma, país, año y rating comunitario; obtiene créditos mediante `PeopleRepository` con concurrencia limitada.
- Prioriza las tarjetas nativas de Showly: el motor calcula el orden y la pantalla conserva las tarjetas, imágenes, estados y navegación originales.
- Excluye películas ya calificadas y ocultas. También excluye colección y watchlist cuando el filtro existente de Showly así lo solicita.
- Si todavía no hay calificaciones, usa señales comunitarias como arranque en frío y mantiene baja la confianza; no inventa preferencias personales.

Por límites de coste y disponibilidad, los créditos se enriquecen para un conjunto acotado del historial y de candidatos. Los metadatos que no estén disponibles no se inventan ni se tratan como preferencias.

## Obtener y configurar el proyecto

Clona incluyendo submódulos:

```bash
git clone --recurse-submodules https://github.com/ElFast-dev/Prisma.git
cd Prisma
python3 scripts/configure_showly_recommender.py
python3 scripts/apply_showly_recommender.py
```

En un clon existente:

```bash
git submodule update --init --recursive
python3 scripts/configure_showly_recommender.py
python3 scripts/apply_showly_recommender.py
```

Ambos scripts son idempotentes. El primero registra `:prisma-recommendation-engine` en Gradle; el segundo agrega el feed `PERSONALIZED` (“Para ti”) y su caso de uso en Showly. No crean commits ni envían cambios al upstream.

El submódulo apunta al repositorio original de Showly. Para distribuir una versión Android derivada, hay que mantener los avisos y obligaciones GPL-3.0 y publicar los cambios del submódulo en un fork propio, nunca en el upstream original.

## Ejecutar pruebas

Requiere JDK 21 y Gradle:

```bash
gradle -p showly-recommendation-engine check
```

Las pruebas JVM cubren normalización y mapeo de metadatos, ranking a partir de calificaciones Trakt, exclusiones, arranque en frío, diversidad y escenarios sintéticos con perfiles reproducibles. Las simulaciones no utilizan datos privados ni una cuenta real.

GitHub Actions aplica los scripts dos veces sobre el commit fijado de Showly, compila Kotlin Android y ejecuta las pruebas configuradas. La validación de calidad con un historial real y las pruebas instrumentadas del flujo completo siguen siendo trabajo pendiente; las simulaciones no se presentan como prueba de precisión real.

## Métricas y evaluación

`RecommendationMetrics` calcula Precision@K, Recall@K, HitRate@K, NDCG@K, cobertura del catálogo y diversidad intra-lista. La evaluación con un historial real debe respetar un corte temporal: entrenar con calificaciones anteriores y medir contra valoraciones posteriores, sin reutilizar las mismas puntuaciones para entrenamiento y evaluación.

## Privacidad y límites

El motor no envía el historial a un modelo remoto ni a un servicio de Prisma. No implementa filtrado colaborativo multiusuario. En un perfil nuevo usa calidad comunitaria con confianza conservadora; la personalización crece automáticamente conforme Showly dispone de más valoraciones.

## Licencia

Showly está publicado bajo GNU GPL versión 3. Se deben conservar los avisos de autoría y cumplir las obligaciones de distribución de la GPL-3.0. Ver el archivo LICENSE del repositorio upstream: https://github.com/trakt/showly/blob/master/LICENSE
