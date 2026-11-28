# Prisma · Showly para Android

Prisma toma **Showly** como base para convertirse en una aplicación Android de seguimiento de películas y series, con recomendaciones personalizadas que aprenden de las calificaciones que ya guardas en la app.

La aplicación base se mantiene en el submódulo **showly-android**, fijado a un commit concreto de **trakt/showly**. Las personalizaciones de Prisma se mantienen en módulos y scripts propios; no se modifica el repositorio upstream.

## Obtener el proyecto

Clona incluyendo el submódulo de Showly:

    git clone --recurse-submodules https://github.com/ElFast-dev/Prisma.git
    cd Prisma

En un clon existente:

    git submodule update --init --recursive

Conecta el motor a Gradle y aplica la integración:

    python3 scripts/configure_showly_recommender.py
    python3 scripts/apply_showly_recommender.py

Los scripts registran el módulo Gradle de Prisma y añaden una opción **«Para ti»** tanto al descubrimiento de películas como al de series. Son idempotentes y solo modifican el working tree local del submódulo; no crean commits ni escriben en el repositorio upstream.

## Configurar Showly

En showly-android/local.properties:

    traktClientId="TU_CLIENT_ID_DE_TRAKT"
    tmdbApiKey="TU_API_KEY_DE_TMDB"

En showly-android/app/keystore.properties, para compilar variantes locales:

    keyAlias=github
    keyPassword=github
    storePassword=github

No guardes claves reales, tokens ni almacenes de firma en Git.

Desde showly-android, compila:

    ./gradlew :app:compileDebugKotlin

## Cómo aprende el recomendador

El recomendador utiliza las **calificaciones normales de Trakt que ya guardas en Showly**. No añade encuestas, botones de gustos, acciones de entrenamiento ni pasos de configuración.

- Las notas altas refuerzan géneros, directores, reparto y otros atributos en común.
- Las notas bajas reducen la afinidad por esos mismos atributos.
- La señal tiene en cuenta tanto el valor de la nota como tu media personal, para no asumir que todas las personas califican igual.
- Las notas recientes pesan más que las antiguas, con un decaimiento gradual.
- Cada vez que se vuelve a calcular el feed, se lee el historial local actualizado; editar o eliminar una nota cambia el perfil automáticamente.

Las recomendaciones de películas usan metadatos de películas. Las recomendaciones de series usan géneros, cadenas/plataformas, reparto, dirección, guion, país y década cuando están disponibles. Los títulos que ya calificaste no se repiten en el feed personalizado. También se respetan los elementos ocultos y los filtros nativos de colección y watchlist.

Para que «Para ti» no se limite a ordenar las tendencias, al entrar en el feed Showly consulta también los títulos relacionados de hasta cuatro películas o series que calificaste con 8/10 o más. Cada consulta pide un máximo de 10 relacionados; el conjunto extra se limita a 40 títulos y a dos solicitudes simultáneas. Se combina con los candidatos habituales de Descubrir y se ordena con el perfil completo: las notas altas generan afinidad y las bajas penalizan atributos similares. Si Trakt no devuelve relacionados o la consulta falla, se mantienen los candidatos normales.

El ranking es híbrido: combina afinidad personal, similitud de contenido, calidad comunitaria ajustada por cantidad de votos, popularidad disponible, novedad y diversidad. La puntuación se calcula en el dispositivo; Showly mantiene su sincronización habitual de Trakt y consulta sus endpoints de títulos relacionados de forma acotada para ampliar el catálogo.

## Pruebas

Requiere JDK 21 y Gradle:

    gradle -p showly-recommendation-engine check

Las pruebas cubren el mapeo de metadatos, el cambio automático del ranking al cambiar una nota, exclusiones y simulaciones reproducibles. GitHub Actions aplica la integración dos veces sobre el commit fijado de Showly, compila Kotlin Android y ejecuta los tests configurados.

Las simulaciones verifican propiedades del algoritmo, pero no sustituyen una evaluación real de precisión con un historial de cuenta. El feed solo puede reordenar el conjunto de candidatos que Showly le proporciona; no puede mostrar un título que no esté en ese conjunto.

## Estado del proyecto

La integración conserva las tarjetas, imágenes, navegación y sistemas de seguimiento de Showly. main no se modifica mientras la sustitución Android siga en revisión.

Documentación adicional:
- [Motor de recomendaciones](showly-recommendation-engine/README.md)
- [Integración Android](showly-recommendation-engine/SHOWLY_ANDROID_INTEGRATION.md)
- [Showly upstream](https://github.com/trakt/showly)

## Licencia

Showly utiliza GNU GPL versión 3. Este derivado conserva el texto de licencia. Al distribuir versiones modificadas, conserva los avisos de autoría y cumple las obligaciones de la GPL-3.0.
