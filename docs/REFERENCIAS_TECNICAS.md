# Referencias técnicas oficiales

Fuentes consultadas para el diseño técnico inicial de Prisma (5 de noviembre de 2026). Deben volver a comprobarse antes de cada fase si la tecnología o el comportamiento ha podido cambiar.

## Android

- Recomendaciones de arquitectura: https://developer.android.com/topic/architecture/recommendations
- Guía de arquitectura: https://developer.android.com/topic/architecture
- Diseño offline-first: https://developer.android.com/topic/architecture/data-layer/offline-first
- Room: https://developer.android.com/training/data-storage/room
- DataStore: https://developer.android.com/topic/libraries/architecture/datastore
- Android Keystore: https://developer.android.com/privacy-and-security/keystore
- Idiomas por aplicación: https://developer.android.com/guide/topics/resources/app-languages
- WorkManager: https://developer.android.com/develop/background-work/background-tasks/persistent
- Rendimiento de Compose: https://developer.android.com/develop/ui/compose/performance
- Baseline Profiles: https://developer.android.com/topic/performance/baselineprofiles/overview

## TMDB

- Autenticación de aplicación y API Read Access Token: https://developer.themoviedb.org/docs/authentication-application
- Cómo encontrar/buscar películas: https://developer.themoviedb.org/docs/finding-data
- Cómo construir URL de imágenes: https://developer.themoviedb.org/docs/image-basics
- Referencia general de API: https://developer.themoviedb.org/reference/intro/getting-started

## Fuentes de puntuaciones externas

- IMDb API y acceso: https://data.imdb.com/documentation/api-documentation/
- IMDb: uso de datos en software y restricciones: https://help.imdb.com/article/imdb/general-information/can-i-use-imdb-data-in-my-software/G5JTRESSHJBBHTGX
- Rotten Tomatoes: proceso de licencia de datos y marcas: https://www.rottentomatoes.com/help_desk/licensing
- Metacritic vía proveedor licenciado Fabric Origin: https://developer.origin.fabricdata.com/origin/apis-all/metacritic-api-docs

## GitHub

- Crear un flujo de trabajo de Gradle: https://docs.github.com/es/actions/tutorials/build-and-test-code/java-with-gradle
- Guardar/compartir artifacts de Actions: https://docs.github.com/es/actions/concepts/workflows-and-actions/workflow-artifacts

## Notas

- No se fijan versiones exactas de herramientas en este documento porque deben verificarse y fijarse al preparar la especificación de la fase de implementación.
- Las recomendaciones de Android son guías técnicas; el diseño concreto debe adaptarse al alcance offline-first y privado de Prisma.
- La autorización particular sobre caché, imágenes y JustWatch procede de la comunicación aportada por el propietario y está registrada en el documento de licencia correspondiente.
