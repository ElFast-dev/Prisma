# Propuesta: extraer las acciones de protección del almacenamiento

## Contexto

El servicio `js/core/storage-protection.js` ya encapsula la API del navegador sin depender del DOM. Sin embargo, `app.js` todavía coordina la inspección, el indicador de operación, la solicitud explícita, los avisos y los repintados.

## Objetivo

Trasladar únicamente esa coordinación a `js/app/storage-protection-actions.js`, mediante dependencias inyectadas, para mantener `app.js` como raíz de composición y asegurar que el indicador ocupado se libere ante errores.

## Alcance

- Extraer `refreshStorageProtectionSnapshot` y `requestStorageProtection` conservando sus nombres públicos.
- Mantener la comprobación inicial como operación de solo lectura.
- Invocar la solicitud de persistencia sincrónicamente desde la acción explícita, antes del primer `await` o repintado.
- Mantener la guarda contra solicitudes simultáneas y liberar el indicador ocupado aun si fallan la solicitud o la inspección de recuperación.
- Probar la API del módulo, la interfaz, la arquitectura y la compatibilidad PWA.

## Fuera de alcance

No cambiar el servicio de almacenamiento, el formato ni la persistencia de datos personales, la interfaz visual, el recomendador, las valoraciones, las fechas, las colecciones, TMDB ni otras acciones de aplicación.

## Criterios de aceptación

- La entrada compone el módulo y no contiene los cuerpos de las dos acciones.
- Inspeccionar no solicita persistencia; solo la acción explícita puede hacerlo.
- Las solicitudes simultáneas no inician una segunda operación y el estado ocupado se libera después de cualquier error.
- Se comunican concesión, denegación, API no disponible y error; la interfaz se actualiza solo cuando corresponde.
- SDD, sintaxis, modularidad, protección del almacenamiento, regresión y Playwright validan el mismo SHA antes de integrar.
