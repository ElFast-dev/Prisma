## ADDED Requirements

### Requirement: Experimento local de regresión Ridge

El Laboratorio DEBE permitir ejecutar bajo demanda una evaluación Ridge con regularización L2 y compararla con el modelo aditivo sobre las mismas películas externas. La selección del parámetro DEBE ocurrir dentro del entrenamiento externo y el experimento NO DEBE cambiar las recomendaciones activas ni transmitir o persistir el historial.

#### Scenario: Comparación cruzada sin fuga

- DADO que existen al menos 30 valoraciones únicas válidas con características
- CUANDO se ejecuta el experimento Ridge
- ENTONCES se selecciona alpha mediante pliegues internos y se comparan ambos modelos sobre las mismas cinco particiones externas sin entrenar con sus notas retenidas

#### Scenario: Perfil insuficiente

- DADO que hay menos de 30 valoraciones válidas únicas con características
- CUANDO se ejecuta el experimento
- ENTONCES se informa que la muestra es insuficiente y no se presenta un MAE inventado

#### Scenario: Privacidad y conservación del modelo

- DADO que se ejecuta el experimento con datos locales
- CUANDO se muestran o exportan los resultados agregados
- ENTONCES no se incluyen filas ni residuos por película y la producción sigue usando el modelo aditivo

#### Scenario: Error numérico

- DADO que un sistema lineal no puede resolverse de forma estable
- CUANDO se evalúa un pliegue
- ENTONCES el experimento devuelve un resultado controlado no disponible sin interrumpir las demás funciones
