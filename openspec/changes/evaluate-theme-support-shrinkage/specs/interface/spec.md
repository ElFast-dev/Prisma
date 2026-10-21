## ADDED Requirements

### Requirement: Comunicación clara del experimento de regularización

El Laboratorio DEBE mostrar el MAE de la variante experimental, su diferencia contra el modelo base y el tamaño de muestra cuando la comparación esté disponible. DEBE aclarar que la variante no cambia las recomendaciones activas y que la diferencia descriptiva no prueba significación estadística.

#### Scenario: Comparación disponible

- DADO que al menos cinco películas tienen características evaluables
- CUANDO se abre el Laboratorio
- ENTONCES se muestra la diferencia `MAE base − MAE regularizado` y se explica qué signo favorece a cada variante

#### Scenario: Comparación insuficiente

- DADO que hay menos de cinco muestras evaluables
- CUANDO se abre el Laboratorio
- ENTONCES se explica que el experimento necesita más valoraciones enlazadas
