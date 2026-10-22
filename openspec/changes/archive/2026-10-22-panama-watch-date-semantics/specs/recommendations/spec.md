# Requisitos delta: zona horaria de Panamá y cronología del reto

## ADDED Requirements

### Requirement: Días de visionado en zona horaria de Panamá

Prisma DEBE convertir los instantes a `America/Panama` al calcular días locales y mostrar las fechas de visionado. Debe conservar el timestamp UTC original y aplicar el límite verificado del 15 de enero de 2026 a la exportación reconocida del reto diario.

#### Scenario: UTC cruza la medianoche panameña

- DADO un timestamp `2026-07-09T04:56:59.336Z`
- CUANDO Prisma calcula la fecha de visionado
- ENTONCES lo agrupa en el 8 de julio de 2026 en Panamá, sin cambiar el timestamp guardado

#### Scenario: Fechas de antes del reto

- DADO una película de la exportación reconocida con fecha local anterior al 15 de enero de 2026
- CUANDO Prisma ejecuta la evaluación temporal o activa el proxy
- ENTONCES no la cuenta como visionado fechado, salvo que exista una fecha `user-confirmed`
