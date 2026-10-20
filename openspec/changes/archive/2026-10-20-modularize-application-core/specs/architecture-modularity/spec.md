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
