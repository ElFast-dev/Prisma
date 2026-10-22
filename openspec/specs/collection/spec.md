# Colecciones personales

## Requirements

### Requirement: Colecciones separadas

Prisma DEBE mantener separadas las películas valoradas, vistas, pendientes y ocultas, ya que cada colección tiene un significado distinto en la experiencia del usuario.

#### Scenario: Película pendiente

- DADO un título de película marcado como pendiente
- CUANDO se muestran las recomendaciones
- ENTONCES ese registro no se propone como si todavía no estuviera en la colección del usuario

#### Scenario: Película oculta

- DADO un registro en la colección de ocultos
- CUANDO se generan recomendaciones
- ENTONCES el registro se excluye de los candidatos

### Requirement: Valoraciones válidas

Prisma DEBE conservar en la colección de valoraciones únicamente registros con título y una nota numérica válida entre 1 y 10.

#### Scenario: Nota fuera del rango

- DADO un registro de importación con nota inferior a 1, superior a 10 o no numérica
- CUANDO el estado se normaliza
- ENTONCES el registro no se incluye como valoración válida

### Requirement: Calificación personal solo numérica

El flujo habitual para puntuar una película DEBE permitir seleccionar una nota entera del 1 al 10 y guardar sin pedir emociones, sentimientos o comentarios. Los campos históricos de esos tipos PUEDEN conservarse al editar una valoración antigua para evitar pérdidas, pero NO DEBEN solicitarse ni alimentar el recomendador.

#### Scenario: Calificación rápida

- DADO que la persona abre el panel Calificar de una película
- CUANDO elige una nota entre 1 y 10 y la guarda
- ENTONCES Prisma persiste la nota y los metadatos conocidos de la película sin pedir campos adicionales

#### Scenario: Compatibilidad con datos antiguos

- DADO que una valoración importada contiene campos heredados `emotions` o `note`
- CUANDO se actualiza la nota numérica
- ENTONCES esos campos se conservan sin mostrarse como preguntas ni usarse para recomendar

### Requirement: Protección de campos personales

Los cambios de metadatos externos DEBEN preservar la nota personal, las emociones, la valoración y las fechas personales que ya existan, salvo que la acción solicitada indique explícitamente que se están editando esos campos.

#### Scenario: Enriquecimiento de una película valorada

- DADO un registro con nota, emociones, comentario o fechas personales
- CUANDO TMDB actualiza géneros, sinopsis o cartel
- ENTONCES los campos personales permanecen sin cambios

### Requirement: Identidad y deduplicación

Prisma DEBE preferir un ID TMDB fiable para emparejar registros cuando está presente en ambos lados; la coincidencia por título es una alternativa cuando falta el identificador.

#### Scenario: Registros con el mismo título e IDs distintos

- DADO que ambos registros tienen IDs TMDB positivos distintos
- CUANDO se emparejan para actualizar la colección
- ENTONCES no se transfieren campos personales de una película a la otra solo por el título
