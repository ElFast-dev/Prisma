# Prisma · Showly para Android

Prisma toma **Showly** como base para convertirse en una aplicación Android de seguimiento de películas y series con un motor propio de recomendaciones cinematográficas.

La aplicación base se mantiene en el submódulo `showly-android`, fijado a un commit concreto de `trakt/showly`. El código de Showly no se copia ni se modifica en el repositorio original. Las personalizaciones de Prisma se mantienen en módulos propios.

## Obtener el proyecto

Clona incluyendo el submódulo de Showly:

```bash
git clone --recurse-submodules https://github.com/ElFast-dev/Prisma.git
cd Prisma
```

En un clon existente, inicializa el submódulo:

```bash
git submodule update --init --recursive
```

El motor de Prisma se conecta al proyecto Gradle de Showly mediante un script idempotente:

```bash
python3 scripts/configure_showly_recommender.py
```

El script modifica únicamente el working tree local de `showly-android` para añadir `:prisma-recommendation-engine` como dependencia. No crea commits en el submódulo ni escribe en el repositorio upstream.

## Configurar Showly

Abre `showly-android` en Android Studio o prepara los archivos de configuración indicados por el proyecto upstream.

En `showly-android/local.properties`:

```properties
traktClientId="TU_CLIENT_ID_DE_TRAKT"
tmdbApiKey="TU_API_KEY_DE_TMDB"
```

En `showly-android/app/keystore.properties`, para compilar variantes locales:

```properties
keyAlias=github
keyPassword=github
storePassword=github
```

No guardes claves reales, tokens ni almacenes de firma en Git.

Desde `showly-android`, compila la app:

```bash
./gradlew :app:compileDebugKotlin
```

## Motor de recomendaciones

El módulo `showly-recommendation-engine` implementa un recomendador híbrido local:

- Aprende de las valoraciones personales de Trakt (1–10), teniendo en cuenta su antigüedad y la media personal.
- Aprende señales explícitas positivas y negativas: LIKE, DISLIKE, NOT_INTERESTED y HIDE.
- Pondera género, director, reparto, guion, palabras clave, franquicia, estudio, idioma, país y década cuando los metadatos están disponibles.
- Combina preferencias personales, similitud de contenido, calidad comunitaria ajustada por votos, popularidad y novedad.
- Diversifica la lista y devuelve una explicación y una confianza conservadora por película.
- Calcula Precision@K, Recall@K, HitRate@K, NDCG@K, cobertura y diversidad.

El motor no envía valoraciones a servicios externos y no necesita un modelo remoto.

Ejecuta sus pruebas y la simulación con JDK 21 y Gradle:

```bash
gradle -p showly-recommendation-engine check
```

El workflow de GitHub Actions también ejecuta pruebas del script de configuración y compila Showly con el módulo añadido.

## Estado real de la integración

El motor, el adaptador para los modelos de Showly, el caso de uso y la simulación están implementados. El módulo puede añadirse a la compilación Android.

**Todavía falta conectar el origen real de datos Room/Trakt/TMDB con `ShowlyRecommendationDataSource` y añadir el feed “Para ti” dentro de `DiscoverMoviesCase`.** También falta persistir el feedback explícito en Room y cubrir esa integración con pruebas Android. Por tanto, el recomendador todavía no está disponible como una pantalla funcional dentro de la app.

La PWA React/Vite anterior ya no forma parte de esta rama del proyecto. La rama principal no se cambia hasta validar la sustitución Android.

## Documentación

- [Motor y arquitectura](showly-recommendation-engine/README.md)
- [Guía de integración Android](showly-recommendation-engine/SHOWLY_ANDROID_INTEGRATION.md)
- [Showly upstream](https://github.com/trakt/showly)

## Licencia

Showly utiliza GNU GPL versión 3. Este derivado conserva el texto de licencia. Al distribuir versiones modificadas, conserva los avisos de autoría y cumple las obligaciones de la GPL-3.0.
