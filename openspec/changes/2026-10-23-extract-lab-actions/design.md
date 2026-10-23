# Diseño: acciones del Laboratorio en un módulo propio

## Decisión

Crear createLabActions(ctx) en js/app/lab-actions.js. La raíz app.js seguirá siendo responsable de componer el estado y proporcionar dependencias; conservará envoltorios finos con la misma API que consume la interfaz.

## Límites

- El módulo recibe estado y servicios por inyección: evaluadores, renderizado, avisos, perfil, resumen de diagnóstico, navegador y portapapeles.
- La lógica del motor, el ranking, la extracción de características y la serialización del informe permanece en sus módulos actuales.
- Las evaluaciones siguen siendo locales y se ejecutan solo por solicitud. Los identificadores de ejecución conservan la protección frente a resultados obsoletos.
- La copia del informe invoca el portapapeles desde la acción explícita y mantiene la alternativa de selección/copia manual.
- La nueva entrada se añade a sw.js; el nombre de caché y la URL de la aplicación se incrementan de manera coordinada.

## Verificación

Una prueba aislada comprobará exclusión de ejecuciones simultáneas, resultados y fallos, reinicio del estado, activación del proxy temporal, vaciado/copia del informe y el uso sincrónico de la API del portapapeles antes de esperar su promesa. CI y Playwright deberán pasar antes de integrar; Pages deberá desplegar exactamente el SHA comprobado.
