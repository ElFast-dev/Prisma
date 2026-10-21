# Informe diagnóstico del recomendador

## ADDED Requirements

### Requirement: Compartir un informe agregado de evaluación real

El Laboratorio DEBE ofrecer una acción que genere un informe técnico a partir de las métricas actuales del perfil local. El informe DEBE incluir el tamaño y la cobertura de la muestra, resultados disponibles de MAE/nDCG@5/diversidad, pesos del modelo y estadísticas agregadas de señales, sin serializar registros individuales. La interfaz DEBE enumerar claramente las categorías incluidas y excluidas.

#### Scenario: Informe con métricas disponibles

- DADO que el perfil tiene suficientes valoraciones para evaluar al menos algunas métricas
- CUANDO la persona solicita copiar el informe
- ENTONCES el JSON contiene las métricas calculadas y sus tamaños de muestra sin alterar el modelo ni la colección

#### Scenario: Perfil con pocos datos

- DADO que alguna métrica no está disponible por falta de datos
- CUANDO se prepara el informe
- ENTONCES la métrica se representa como no disponible con su razón y nunca se sustituye por cero inventado

#### Scenario: Informe limitado y sin registros de película

- DADO que el historial contiene títulos, IDs TMDB, notas, emociones y fechas
- CUANDO se genera el informe
- ENTONCES solo se exportan agregados y estadísticas limitadas de señales; los registros de películas no se incluyen

#### Scenario: Fallo de portapapeles

- DADO que el navegador no permite escribir en el portapapeles
- CUANDO la persona pulsa copiar
- ENTONCES el informe queda visible en un campo seleccionable y la UI no afirma una copia exitosa
