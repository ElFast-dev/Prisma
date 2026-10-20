# Delta: arquitectura modular del cliente

## Requirements

### Requirement: Separación por responsabilidad

El código de cliente DEBE organizar las responsabilidades de dominio, persistencia, recomendación, importación, integración y presentación en módulos con límites y dependencias explícitos. La entrada de la aplicación DEBE limitarse a componer esos módulos y coordinar el ciclo de vida; no debe convertirse de nuevo en un archivo monolítico.

#### Scenario: Cambio en la normalización de películas

- DADO que una mejora requiere cambiar reglas de normalización o identidad
- CUANDO se implementa el cambio
- ENTONCES la lógica pertinente se modifica en el módulo de dominio y se prueba sin necesitar el DOM ni el estado visual.

### Requirement: Integraciones externas aisladas

Las integraciones externas DEBEN residir en módulos propios que gestionen protocolo, autenticación y transformación de respuestas; la interfaz DEBE consumir una API explícita y conservar la responsabilidad de coordinar acciones y estado visual.

#### Scenario: Error del servicio externo

- DADO que TMDB devuelve un error HTTP o la credencial es inválida
- CUANDO la aplicación solicita datos mediante el cliente modular
- ENTONCES el módulo convierte la respuesta en un error comprensible y la capa de aplicación decide cómo comunicarlo sin que vistas y componentes deban construir peticiones HTTP.

### Requirement: Integraciones externas aisladas

Las integraciones externas DEBEN residir en módulos propios que gestionen protocolo, autenticación y transformación de respuestas; la interfaz DEBE consumir una API explícita y conservar la responsabilidad de coordinar acciones y estado visual.

#### Scenario: Error del servicio externo

- DADO que TMDB devuelve un error HTTP o la credencial es inválida
- CUANDO la aplicación solicita datos mediante el cliente modular
- ENTONCES el módulo convierte la respuesta en un error comprensible y la capa de aplicación decide cómo comunicarlo sin que vistas y componentes deban construir peticiones HTTP.

### Requirement: Pruebas por API pública de módulo

Las pruebas automatizadas DEBEN invocar las funciones exportadas y dependencias inyectadas de los módulos, no depender de extraer fragmentos de `app.js` mediante marcadores textuales.

#### Scenario: Cambio en el motor de recomendación

- DADO que se modifica el perfil, una predicción o una métrica de evaluación
- CUANDO CI valida el comportamiento
- ENTONCES las pruebas ejecutan el motor a través de su interfaz exportada con datos sintéticos y dependencias controladas.

### Requirement: Carga modular compatible con PWA

La aplicación DEBE cargar los módulos nativos desde rutas relativas compatibles con GitHub Pages y el service worker DEBE incluir los módulos locales necesarios dentro de la caché versionada del shell.

#### Scenario: Instalación de una versión con módulos nuevos

- DADO que una publicación introduce un módulo JavaScript local
- CUANDO se instala la nueva caché del service worker
- ENTONCES el módulo queda disponible desde el recurso estático publicado y la aplicación no sirve una mezcla de versiones anteriores y nuevas.

### Requirement: Modularidad verificada por CI

CI DEBE comprobar que los módulos declarados existen, que las importaciones locales resuelven a rutas dentro del repositorio, que la entrada no vuelve a contener las responsabilidades ya extraídas y que los recursos importados están cubiertos por las comprobaciones de PWA.

#### Scenario: Un archivo vuelve a ser monolítico

- DADO que una modificación vuelve a insertar funciones extraídas en la entrada o introduce una importación local no inventariada
- CUANDO se ejecutan las pruebas de arquitectura
- ENTONCES CI falla e identifica el límite modular incumplido.


### Requirement: Modelo del catálogo aislado

El modelo del catálogo DEBE administrar la combinación e identidad de películas en un módulo aparte del controlador de la interfaz, usando proveedores explícitos para acceder al estado y al índice del catálogo.

#### Scenario: Se combinan fuentes del catálogo

- DADO que Prisma recibe películas del catálogo de muestra, la biblioteca personal e historial valorado
- CUANDO se reconstruye el catálogo
- ENTONCES la combinación y búsqueda ocurren en el módulo de catálogo y la interfaz recibe el resultado a través de su API.


### Requirement: Modelo de colección aislado

La lógica de consulta, enriquecimiento, filtrado y clasificación de los registros de la colección DEBE vivir en un módulo separado de la presentación y recibir el estado y los filtros mediante dependencias explícitas.

#### Scenario: Aplicar filtros a la colección

- DADO que el usuario elige historial, pendientes u ocultos y ajusta búsqueda, géneros u orden
- CUANDO se solicitan los elementos de la colección
- ENTONCES el módulo de colección devuelve los registros filtrados sin acceder al DOM ni renderizar HTML.


### Requirement: Utilidades de presentación separadas

Los formateadores, enlaces externos y fragmentos visuales reutilizables DEBEN residir en un módulo de presentación con dependencias explícitas, sin duplicar sus implementaciones en el controlador principal.

#### Scenario: Cambia el formato de una fecha o puntuación pública

- DADO que se modifica un formateador o la construcción de enlaces de puntuaciones
- CUANDO se ejecutan pruebas automatizadas
- ENTONCES el comportamiento se prueba directamente a través de la API del módulo, sin extraer código por texto del controlador.


### Requirement: Vistas de página separadas del coordinador

Los renderizadores de las páginas y componentes visuales principales DEBEN vivir en un módulo de vistas, recibir estado y dependencias mediante un contexto explícito y devolver marcado sin apropiarse del ciclo de vida global de la aplicación.

#### Scenario: Se cambia una vista de página

- DADO que se modifica la presentación de Progreso, Descubrir, Colección, Laboratorio o Ajustes
- CUANDO se ejecuta la aplicación
- ENTONCES la implementación reside en el módulo de vistas y la entrada solo conecta sus dependencias y selecciona la vista.


### Requirement: Vistas modales separadas de sus acciones

Los renderizadores de fichas, personas, puntuaciones y paneles auxiliares DEBEN vivir en un módulo de interfaz distinto de las acciones que guardan valoraciones, listas y estado de navegación.

#### Scenario: Cambio visual en una ficha o panel

- DADO que se modifica la presentación de una ficha de película, de una persona o del panel de puntuación
- CUANDO se ejecuta Prisma
- ENTONCES el marcado visual procede del módulo modal y las acciones siguen coordinadas mediante controladores separados.


### Requirement: Acciones de colección separadas del controlador

Las operaciones que modifican valoraciones, historial, pendientes u ocultos DEBEN residir en un módulo de acciones separado de los renderizadores y enlazarse con el estado, la persistencia y la interfaz mediante dependencias explícitas.

#### Scenario: El usuario guarda una valoración

- DADO que el usuario confirma una nota entre 1 y 10
- CUANDO se procesa la acción
- ENTONCES el módulo de acciones actualiza los datos personales y coordina su persistencia mediante las dependencias recibidas sin duplicar la lógica dentro del coordinador.


### Requirement: Orquestación de datos separada

Las operaciones de importación, exportación, restauración y restablecimiento DEBEN vivir en un módulo de aplicación que use los analizadores de datos y la persistencia compartidos, sin duplicar esos flujos en la entrada.

#### Scenario: Se restaura una copia de seguridad

- DADO un archivo de respaldo válido de Prisma
- CUANDO el usuario confirma la restauración
- ENTONCES el módulo de datos valida y normaliza el contenido, guarda el estado local y solicita la actualización de la interfaz mediante las dependencias recibidas.


### Requirement: Registro de eventos aislado

Los listeners globales y la delegación de interacciones DEBEN residir en un módulo propio que reciba mediante una interfaz explícita el estado y las acciones que invoca; la entrada debe limitarse a registrar ese módulo.

#### Scenario: Se activa una acción desde la interfaz

- DADO que el usuario activa un control de navegación, colección, puntuación o importación
- CUANDO se procesa el evento delegado
- ENTONCES el módulo de eventos dirige la acción adecuada mediante las dependencias recibidas sin mantener un segundo controlador monolítico en la entrada.


### Requirement: Acciones de configuración TMDB aisladas

El almacenamiento, prueba y retirada de la credencial TMDB DEBEN vivir en un módulo de integración separado, usando la persistencia y las peticiones compartidas mediante dependencias explícitas.

#### Scenario: El usuario prueba una credencial

- DADO que el usuario introduce una credencial para TMDB
- CUANDO comprueba la conexión
- ENTONCES la acción utiliza el cliente TMDB compartido y muestra el resultado mediante las dependencias de interfaz recibidas.


### Requirement: Vistas de TMDB aisladas

La presentación de resultados, atribución y estado de sincronización de TMDB DEBE residir en un módulo de vistas y recibir mediante dependencias explícitas el estado remoto y las utilidades visuales.

#### Scenario: Se muestran resultados de TMDB

- DADO que hay resultados, carga, error o ausencia de credenciales para TMDB
- CUANDO se actualiza el navegador de películas
- ENTONCES el módulo de vistas representa el estado correcto sin poseer la lógica de consulta remota.


### Requirement: Sincronización de metadatos aislada

La limpieza de la caché de metadatos y la sincronización progresiva de TMDB con historial y colecciones DEBE residir en un módulo de integración que use la persistencia y el modelo de catálogo mediante dependencias explícitas.

#### Scenario: Se completa el historial con metadatos externos

- DADO que hay películas del historial que carecen de metadatos TMDB recientes
- CUANDO el usuario inicia la sincronización
- ENTONCES el módulo de sincronización actualiza lotes, persiste el progreso y mantiene disponible la interfaz durante el proceso.


### Requirement: Navegación remota de películas aislada

Las consultas de búsqueda/paginación a TMDB y la carga diferida de metadatos DEBEN estar separadas de la presentación y del coordinador, usando el cliente TMDB compartido y estado de petición explícito.

#### Scenario: Una búsqueda remota cambia mientras carga

- DADO que una petición anterior sigue en curso cuando cambia la búsqueda
- CUANDO llega la respuesta antigua
- ENTONCES esa respuesta no sobrescribe el resultado de la petición más reciente.


### Requirement: Servicio de detalles separado

El acceso a detalles de películas y personas, y la persistencia de metadatos ampliados DEBE vivir en el módulo de servicio TMDB, separado de la presentación.

#### Scenario: Se abre una ficha enriquecida

- DADO que el usuario abre una película con ID TMDB y la conexión está configurada
- CUANDO se solicitan detalles ampliados
- ENTONCES el servicio carga detalles/proveedores/personas y actualiza el estado mediante dependencias explícitas.


### Requirement: Controlador de modales separado

Las transiciones de abrir, cerrar y cambiar entre fichas, puntuaciones y paneles auxiliares DEBEN estar coordinadas por un módulo de controlador distinto del renderizado visual.

#### Scenario: Se abre el diálogo de puntuación

- DADO que el usuario selecciona calificar una película
- CUANDO se cambia del detalle al diálogo de puntuación
- ENTONCES el controlador cambia el estado modal, mantiene el retorno al detalle cuando corresponde y delega el marcado en las vistas.


### Requirement: Ranking de recomendaciones separado

La selección, diversificación y estadísticas descriptivas de recomendaciones DEBE residir fuera del archivo de entrada, usando el motor de perfil y predicción como dependencias.

#### Scenario: Se generan recomendaciones

- DADO que existe un catálogo y un perfil local
- CUANDO se solicita una lista de recomendaciones
- ENTONCES el módulo ordena y diversifica candidatas y excluye las películas ya presentes en la colección.


### Requirement: Runtime de la aplicación separado

La persistencia del estado principal, los eventos de actividad y los avisos visibles DEBE residir en un módulo de runtime y estar disponible como una interfaz explícita para las acciones.

#### Scenario: Se persiste una acción

- DADO que se cambia una colección o se registra una valoración
- CUANDO se actualiza el estado personal
- ENTONCES las acciones llaman al módulo runtime para persistir y comunicar errores de guardado.


### Requirement: Ciclo de vida separado

La navegación principal, la carga inicial de datos y el registro del service worker DEBE estar contenida en el módulo de ciclo de vida, sin duplicarse en el coordinador.

#### Scenario: Se inicia Prisma

- DADO que el navegador carga la entrada de la aplicación
- CUANDO finaliza la lectura de catálogo, estado y credencial opcional
- ENTONCES el ciclo de vida normaliza los datos, construye el catálogo, renderiza la vista inicial y registra la PWA si procede.
