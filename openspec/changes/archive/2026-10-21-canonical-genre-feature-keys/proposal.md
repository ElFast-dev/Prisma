# Propuesta: claves canónicas para géneros del perfil

## Contexto

El catálogo normaliza géneros con `displayGenre`, que convierte etiquetas inglesas como `science fiction` a nombres españoles. En cambio, `movieFeatures` previamente solo pasaba a minúsculas el texto del género. Como las valoraciones personales tienen prioridad sobre el género del catálogo, una misma película puede producir claves distintas según si el valor viene del historial, de TMDB o de un CSV. Esto reduce artificialmente las coincidencias y contamina la cobertura y los pesos aprendidos.

## Objetivo

Establecer una única función canónica de género en el módulo común y usarla tanto al normalizar registros de catálogo como al extraer características del perfil.

## Alcance

- Reconocer alias frecuentes, mayúsculas/minúsculas, acentos y separadores de los géneros ya localizados.
- Usar la misma clave de género en `normalizeMovie` y `movieFeatures`.
- Eliminar duplicados después de la normalización.
- Añadir pruebas cruzadas para TMDB, historial personal y CSV.
- Actualizar los requisitos SDD y la versión de caché PWA para que los navegadores adopten el arreglo.

## Fuera de alcance

- No cambiar los pesos de señales ni la fórmula de puntuación.
- No borrar ni migrar valoraciones, catálogo o datos personales almacenados.
- No cambiar la identidad TMDB ni traducir los tags temáticos.
- No activar Ridge ni el modelo híbrido en producción.

## Criterios de aceptación

1. Alias como `science fiction`, `sci-fi`, `ciencia ficción` y `ciencia ficcion` producen la misma señal.
2. `thriller` y `Suspense` producen la misma señal canónica.
3. Una lista que contiene varias variantes de un mismo género produce una sola característica.
4. La normalización de catálogo y el extractor de características comparten el mismo contrato canónico.
5. Las pruebas de recomendación, catálogo, SDD, privacidad y caché PWA pasan sin modificar las predicciones activas más allá de corregir coincidencias antes perdidas.
