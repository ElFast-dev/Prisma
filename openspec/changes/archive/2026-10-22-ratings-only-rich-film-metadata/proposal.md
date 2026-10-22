# Propuesta: calificación numérica y recomendaciones a partir de metadatos

## Motivación

La interacción esencial debe ser simple: buscar una película ya vista, darle una nota del 1 al 10 y permitir que Prisma aprenda a partir de esa señal y de los datos objetivos disponibles de la película. La calificación no debe requerir registrar emociones, sentimientos ni comentarios.

El motor activo parte de géneros, palabras clave y década, mientras que TMDB puede entregar más información cinematográfica. Parte de esos datos no estaba normalizada como características del perfil o de las candidatas.

## Alcance

- Reducir el panel Calificar a una nota del 1 al 10.
- Ampliar las señales del recomendador con sinopsis, reparto, dirección, guion, música, productoras, países, idiomas, franquicia, duración y década fiable, además de géneros y palabras clave.
- Usar detalles y créditos de TMDB para enriquecer historial personal y una cantidad limitada de candidatas remotas en memoria.
- Hacer que una primera nota alta o baja ya pueda aportar una señal, suavizando la predicción base hacia un valor neutral.
- Preservar campos emocionales o comentarios antiguos por compatibilidad, sin solicitarlos ni usarlos para recomendar.
- Mantener privacidad local, catálogo inicial vacío, identidad TMDB y exclusiones de toda la colección.

## Fuera del alcance

- Inferir emociones, analizar sentimientos o pedir explicaciones a la persona.
- Guardar automáticamente todas las películas remotas consultadas.
- Añadir backend, cuentas o envío del perfil personal.
- Presentar las predicciones como certezas o como un modelo científicamente validado.

## Criterios de aceptación

- La persona puede calificar una película con una nota y sin rellenar campos adicionales.
- Una sola nota con metadatos genera señales positivas o negativas acordes a la puntuación.
- Las características proceden de campos reales de TMDB o del registro local y se omiten cuando no están disponibles.
- Emociones y notas libres heredadas no alteran el perfil ni las recomendaciones.
- El enriquecimiento remoto es acotado y temporal y no guarda candidatas en la colección personal.
- Se ejecutan pruebas de regresión, calidad, flujo de navegador y despliegue antes de cerrar el cambio.