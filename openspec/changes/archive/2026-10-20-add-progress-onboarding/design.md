# Diseño: guía de primera ejecución en Progreso

## Decisión

Reutilizar la estructura visual ya definida por `.onboarding-callout` y mantener la guía dentro de la vista Progreso, visible cuando `summaryStats().total === 0`. La guía no guardará un indicador nuevo: deriva su visibilidad del número de valoraciones válidas para evitar estado adicional y migraciones.

## Interfaz

- Título breve: «Empieza a construir tu perfil».
- Texto de una frase que explica que valorar películas o importar el historial da señales al recomendador.
- Acción principal «Explorar películas» con `data-nav="catalog"`.
- Acción secundaria «Importar historial» con `data-nav="data"`.
- Dos acciones en fila en escritorio y en un grupo adaptable en pantallas estrechas; foco visible y nombres accesibles.

## Pruebas

El workflow Playwright usa un contexto de navegador nuevo en escritorio y móvil. Comprobará que la guía aparece al inicio, que los dos destinos navegan a sus vistas y que desaparece después de guardar una valoración sintética. No se requiere TMDB ni datos reales.

## Riesgos

La guía depende del recuento de valoraciones válidas, no de eventos o del historial; perfiles que solo importan vistas o pendientes seguirán viendo cómo empezar a aportar señales al recomendador. No se cambia ninguna regla de recomendaciones ni la persistencia.


## Resultado de la revisión

La revisión técnica confirmó que la visibilidad se deriva del número de valoraciones válidas y no necesita una nueva clave persistida. Playwright pasó en escritorio y móvil para la aparición, ambas rutas y la desaparición posterior a una valoración. La URL del CSS y el JavaScript y la caché PWA están sincronizadas.
