## ADDED Requirements

### Requirement: Batería matemática integrada
El diagnóstico DEBE ejecutar automáticamente la línea base heurística, calidad del ranking, normalización, Ridge y evaluación temporal cuando sus requisitos se cumplan, registrando explícitamente resultados no disponibles y limitaciones de muestra. La evaluación temporal automática DEBE desactivar el proxy de fecha de incorporación a lista.

#### Scenario: Perfil con pocas valoraciones
- DADO que hay menos valoraciones enlazadas que los mínimos para Ridge o temporal
- CUANDO corre la batería integral
- ENTONCES las fases insuficientes terminan como no disponibles con los mínimos requeridos, y las fases que sí tengan muestra continúan.

#### Scenario: Evaluación temporal sin fechas fiables suficientes
- DADO que no hay suficientes valoraciones con metadatos y fechas de visionado utilizables
- CUANDO se ejecuta la fase temporal automática
- ENTONCES se informa la causa y no se sustituye automáticamente la fecha de visionado por la fecha de incorporación a una lista.

### Requirement: Comparación emparejada de familias de señales
El diagnóstico DEBE comparar al menos géneros; géneros con etiquetas; géneros, etiquetas y sinopsis; y el conjunto completo de señales actuales usando las mismas películas retenidas y las mismas particiones. Las notas retenidas NO DEBEN participar en la construcción del perfil de entrenamiento, y el motor de producción DEBE permanecer sin modificaciones durante el experimento.

#### Scenario: Perfil sintético amplio
- DADO un perfil de prueba sintético con 351 películas únicas, metadatos de género, etiquetas y sinopsis
- CUANDO se evalúan las cuatro familias
- ENTONCES las cuatro variantes informan la misma muestra/pliegues, medidas por familia, y verificaciones de que cada identidad retenida queda fuera del entrenamiento.

#### Scenario: Sin muestra suficiente con géneros
- DADO que no existen cinco películas valoradas únicas con géneros enlazados
- CUANDO se ejecuta la comparación de familias
- ENTONCES el resultado declara «No disponible» con una causa y no publica MAE ni nDCG ficticios.
