# Tareas: corregir falso positivo subpíxel

- [x] R1. Investigar el fallo de la prueba visual en la versión publicada.
- [x] R2. Crear propuesta, diseño y especificación antes de cambiar la comprobación.
- [x] R3. Verificar tanto el `min-height` CSS como la altura renderizada con tolerancia subpíxel.
- [x] R4. Pasar calidad, SDD, validación y pruebas visuales de PR.
- [x] R5. Confirmar la comprobación sobre la publicación y archivar la especificación con evidencias.

## Evidencia de verificación

- Calidad, SDD y pruebas funcionales del PR: correctas, [workflow 39543908332](https://github.com/ElFast-dev/Prisma/actions/runs/39543908332).
- Validación de Prisma en el PR: correcta, [workflow 39543908296](https://github.com/ElFast-dev/Prisma/actions/runs/39543908296).
- Pruebas visuales de escritorio y móvil en el PR: correctas, [workflow 39543908294](https://github.com/ElFast-dev/Prisma/actions/runs/39543908294).
- Calidad y SDD sobre `main`: correctas, [workflow 39544071612](https://github.com/ElFast-dev/Prisma/actions/runs/39544071612).
- Validación de Prisma sobre `main`: correcta, [workflow 39544071618](https://github.com/ElFast-dev/Prisma/actions/runs/39544071618).
- Despliegue de GitHub Pages: correcto, [workflow 39544071544](https://github.com/ElFast-dev/Prisma/actions/runs/39544071544).
- Pruebas visuales posteriores al despliegue: correctas, [workflow 39544102470](https://github.com/ElFast-dev/Prisma/actions/runs/39544102470).

## Resultado y límites

El test conserva el requisito de `min-height: 44px` CSS y tolera hasta 0,5 píxeles CSS de diferencia en la geometría calculada por el navegador. No se cambió CSS de producción ni el comportamiento del recomendador.
