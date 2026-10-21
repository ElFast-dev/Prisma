# Tareas: tema negro y modo claro

## Especificación
- [x] Registrar alcance, paleta, persistencia local, accesibilidad y criterios de aceptación antes de implementar.
- [x] Definir escenarios de tema oscuro predeterminado, cambio a claro y restauración tras recarga.

## Implementación
- [x] Alinear el isotipo con la paleta azul y versionar favicon, cabecera y manifest.
- [x] Añadir el controlador modular de preferencia y persistencia de tema.
- [x] Actualizar tokens del sistema visual a negro y azul apagado.
- [x] Incorporar overrides legibles para el modo claro en vistas, paneles, tarjetas, ficha y formularios.
- [x] Añadir selector Oscuro/Claro accesible en Ajustes.
- [x] Versionar entrada JavaScript, CSS y caché PWA.
- [x] Extender pruebas estáticas y de modularidad para los dos temas.

## Validación y cierre
- [x] Validar SDD, sintaxis y todas las pruebas estáticas en CI.
- [x] Verificar el cambio de tema, persistencia y estados accesibles con Playwright en la rama y en la web publicada, escritorio y móvil.
- [x] Fusionar el cambio y confirmar GitHub Pages y Playwright de la web publicada.
- [x] Archivar la propuesta con evidencias finales de CI, despliegue y validación de UI publicada.


## Evidencia

- PR fusionado: https://github.com/ElFast-dev/Prisma/pull/17
- Commit: https://github.com/ElFast-dev/Prisma/commit/9aa8adeb4b7e7d9840b24544eb5a79d1dd5c3556
- SDD/calidad: https://github.com/ElFast-dev/Prisma/actions/runs/39519374500
- Validate Prisma: https://github.com/ElFast-dev/Prisma/actions/runs/39519374453
- Deploy Pages: https://github.com/ElFast-dev/Prisma/actions/runs/39519374424
- Playwright de la rama: https://github.com/ElFast-dev/Prisma/actions/runs/39518978427

- Playwright post-despliegue: https://github.com/ElFast-dev/Prisma/actions/runs/39519413042
