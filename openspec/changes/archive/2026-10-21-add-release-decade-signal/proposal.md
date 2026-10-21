# Incorporar la década de estreno como señal secundaria

## Problema

El recomendador personaliza actualmente con géneros y etiquetas/keywords enlazadas. Los registros de catálogo ya pueden tener año o fecha de estreno, pero el motor no aprovecha esa información. La época de estreno puede describir un gusto contextual, aunque también es una señal débil y fácil de sobrerrepresentar.

## Objetivo

Añadir una característica de década de estreno con influencia intencionadamente baja, mantener las explicaciones transparentes y medir su efecto fuera de muestra contra la misma predicción sin esa señal.

## Alcance

- Extraer la década a partir de años y fechas válidas ya disponibles en los registros locales o TMDB.
- Ponderar la señal de década por debajo del género y de las etiquetas.
- Explicar la contribución como «década de 2010», no como una etiqueta técnica.
- Ampliar la evaluación leave-one-out para comparar el MAE del modelo completo con el de la variante sin señal de década, sobre las mismas muestras.
- Mostrar el efecto de la década solo con al menos cinco valoraciones evaluables con año válido.
- Añadir pruebas sintéticas, actualizar las especificaciones y preservar la caché PWA.

## Fuera del alcance

- Solicitudes nuevas a TMDB, credenciales, dependencias, backend o almacenamiento adicional.
- Reutilizar la fecha en que se vio la película como si fuera fecha de estreno.
- Ajustar automáticamente el peso usando la evaluación, lo que podría sobreajustarse al historial pequeño.
- Afirmar que una prueba sintética garantiza recomendaciones mejores para una persona concreta.

## Criterios de aceptación

1. Un año válido produce un único rasgo de década estable; datos ausentes o imposibles no generan esa señal.
2. La influencia directa de década es 0,20, inferior a género (1,0) y etiqueta (0,35).
3. Las explicaciones presentan la década en español comprensible y solo si su contribución efectiva lo justifica.
4. El Laboratorio compara modelo completo, media de entrenamiento y variante sin década con las mismas particiones leave-one-out; solo presenta el efecto específico de década cuando hay al menos cinco registros con año válido.
5. El perfil sigue siendo local, la colección inicial permanece vacía y no cambian valoraciones, identidad de películas ni datos persistidos.
6. Las pruebas SDD, sintaxis, evaluación, módulos, caché y regresión de producto pasan antes de archivar el expediente.
