# Propuesta: persistir la racha diaria confirmada

## Problema

La colección de películas y una racha de visionado son conceptos diferentes. Una aplicación anterior pudo perder títulos de la colección sin que eso invalidara la racha que la persona confirma. Inferir la racha únicamente a partir de filas de película puede crear huecos falsos; recrear títulos para rellenarlos inventaría datos.

## Cambio

- Guardar una declaración local de la racha confirmada: 15/01/2026–21/10/2026, 280 días, meta de una película por día.
- Generar un calendario de exactamente 280 marcadores, uno por fecha, independiente de las filas del catálogo.
- Vincular a cada fecha un título conservado si hay una marca fiable; si no, conservar el día y explicitar que el título falta.
- Si varias películas comparten fecha, mostrar un único marcador de racha y mantener las películas sin alteraciones.
- Persistir la declaración en IndexedDB y en las copias de seguridad existentes; no transmitirla por red.
- Mantener la regla condicionada a la importación reconocida, para que una instalación vacía no muestre datos personales ajenos.

## No objetivos

- No reconstruir títulos que la app anterior perdió.
- No cambiar las marcas UTC originales del historial.
- No convertir una fecha local del calendario en una fecha/hora ficticia de visionado.
- No presentar como comprobación independiente una racha cuya veracidad ha confirmado la persona.
