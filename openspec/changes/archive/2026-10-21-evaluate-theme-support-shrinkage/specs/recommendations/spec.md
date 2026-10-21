## ADDED Requirements

### Requirement: Evaluación experimental de regularización por soporte de temas

Prisma DEBE poder comparar de forma local el modelo activo con una variante de diagnóstico que atenúe temas respaldados por pocas valoraciones. La comparación DEBE usar las mismas muestras leave-one-out, entrenar ambos perfiles sin la nota retenida y calcular el MAE para cada variante. La variante experimental NO DEBE cambiar las recomendaciones activas de forma automática.

#### Scenario: Tema poco respaldado

- DADO un tema presente en una única película valorada del pliegue de entrenamiento
- CUANDO se construye el perfil experimental con regularización por soporte
- ENTONCES su peso se multiplica por un tercio y el perfil base permanece sin cambios

#### Scenario: Comparación con la misma muestra

- DADO un conjunto de películas evaluables
- CUANDO se comparan las dos variantes
- ENTONCES ambas predicciones usan la misma película retenida y el mismo conjunto de entrenamiento por cada iteración

#### Scenario: Datos insuficientes

- DADO que hay menos de cinco películas valoradas con características
- CUANDO se calcula el Laboratorio
- ENTONCES la evaluación experimental se muestra como no disponible en vez de inventar una cifra

#### Scenario: Conservar el modelo activo

- DADO que existe una puntuación regularizada experimental
- CUANDO Prisma recomienda películas durante el uso normal
- ENTONCES sigue usando el perfil base y no la variante experimental hasta que una decisión separada se apoye en los resultados
