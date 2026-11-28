# Contribuir a Prisma · Showly

El objetivo es mantener una versión derivada de Showly para Android con un recomendador local y personalizado.

## Preparar el repositorio

```bash
git clone --recurse-submodules https://github.com/ElFast-dev/Prisma.git
cd Prisma
python3 scripts/configure_showly_recommender.py
```

Requisitos: JDK 21, Gradle 9.6 o el Gradle Wrapper de Showly, Android SDK y Python 3 para los scripts de integración.

## Módulo de recomendaciones

Ejecuta las pruebas JVM:

```bash
gradle -p showly-recommendation-engine check
python3 scripts/test_configure_showly_recommender.py
```

El motor debe permanecer independiente de Android, Room, Retrofit y Hilt. Recibe perfiles de películas e historial ya enriquecidos; devuelve puntuaciones, explicaciones y orden. No debe consultar servicios de red ni transmitir datos personales.

## Integración Android

La integración debe:
- unir las valoraciones Trakt con películas de Room usando ID Trakt;
- completar películas que falten con el repositorio de detalles;
- aprovechar créditos TMDB reales y caché;
- excluir películas vistas, calificadas, ocultas o descartadas;
- persistir feedback explícito con migraciones Room;
- integrar un feed personalizado sin romper los flujos existentes de imágenes, navegación y watchlist.

Ejecuta desde `showly-android` las tareas de compilación y pruebas que cubran los módulos modificados:

```bash
./gradlew :app:compileDebugKotlin
./gradlew :app:testDebugUnitTest
./gradlew :repository:testDebugUnitTest
./gradlew :ui-discover-movies:testDebugUnitTest
```

## Submódulo y upstream

`showly-android` apunta al repositorio original de Showly y a un commit fijado. No hagas commits ni pushes en el repositorio upstream. Para modificar archivos pertenecientes al código base Android en una distribución derivada, crea primero un fork propio de Showly y actualiza `.gitmodules` para que apunte a ese fork.

## Datos, credenciales y privacidad

No incluyas claves Trakt/TMDB, keystores, tokens, historial real, valoraciones personales ni copias de seguridad. Usa datos sintéticos reproducibles en las pruebas.

No inventes metadatos ausentes. Los créditos, keywords, estudios, colecciones y popularidad solo pueden influir en las recomendaciones cuando estén disponibles desde una fuente real.

## Pull requests

Describe el cambio, enumera las pruebas ejecutadas y señala expresamente cualquier integración que siga pendiente. No marques como funcional el feed de recomendaciones hasta que use datos reales de Room/Trakt/TMDB y esté conectado a la interfaz.
