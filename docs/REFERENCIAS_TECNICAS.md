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
- Actualización de aplicaciones Android (applicationId, firma y versionCode): https://developer.android.com/google/play/app-updates
- Firma de aplicaciones y continuidad de la clave de firma: https://developer.android.com/studio/publish/app-signing
- PackageManager.canRequestPackageInstalls y permiso REQUEST_INSTALL_PACKAGES: https://developer.android.com/reference/android/content/pm/PackageManager#canRequestPackageInstalls()
- PackageInstaller y sesiones de instalación: https://developer.android.com/reference/android/content/pm/PackageInstaller
- Rendimiento de Compose: https://developer.android.com/develop/ui/compose/performance
- Baseline Profiles: https://developer.android.com/topic/performance/baselineprofiles/overview

## Tipografía

- Proyecto oficial de la familia Inter, descargas y documentación: https://github.com/rsms/inter
- Lanzamientos oficiales de Inter: https://github.com/rsms/inter/releases
- Licencia oficial: SIL Open Font License 1.1, incluida en el archivo `LICENSE.txt` del proyecto: https://github.com/rsms/inter/blob/master/LICENSE.txt
- La OFL permite incluir, incrustar y redistribuir la fuente junto con una aplicación, pero no vender el archivo tipográfico por separado. Si se distribuye una fuente derivada, deben respetarse las condiciones de nombres reservados. Al incorporar Inter en Prisma se conservará el texto de licencia y los avisos correspondientes.
- La versión concreta y el formato de los archivos de Inter que se incluirán en la aplicación se verificarán y fijarán en la especificación técnica de la fase de implementación.

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
- API REST de Releases: consulta de la Release estable más reciente y sus assets: https://docs.github.com/en/rest/releases/releases#get-the-latest-release
- API REST de Releases: listado paginado de las Releases publicadas, con acceso al cuerpo de las notas y sus assets: https://docs.github.com/en/rest/releases/releases#list-releases
- Acerca de GitHub Releases: publicación de versiones, notas de publicación y archivos binarios: https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases
- API REST de assets de Releases y metadatos de integridad: https://docs.github.com/en/rest/releases/assets
- Guardar/compartir artifacts de Actions: https://docs.github.com/es/actions/concepts/workflows-and-actions/workflow-artifacts

## Notas

- No se fijan versiones exactas de herramientas en este documento porque deben verificarse y fijarse al preparar la especificación de la fase de implementación.
- Las recomendaciones de Android son guías técnicas; el diseño concreto debe adaptarse al alcance offline-first y privado de Prisma.
- La autorización particular sobre caché, imágenes y JustWatch procede de la comunicación aportada por el propietario y está registrada en el documento de licencia correspondiente.
