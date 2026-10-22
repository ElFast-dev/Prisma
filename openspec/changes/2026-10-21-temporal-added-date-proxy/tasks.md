# Tareas: proxy temporal de fecha de incorporación

- [x] Identificar la forma real del JSON importado y distinguir `cH.a` (incorporación a colección), `rM.rA` (fecha asociada a valoración) y `watchedAt`.
- [x] Añadir marcador `addedAtSource = imported-collection` sin convertir `addedAt` a `watchedAt`.
- [x] Añadir un proxy diagnóstico opcional, desactivado por defecto, limitado a registros con procedencia de colección importada.
- [x] Mostrar el control y el aviso de resultado exploratorio en el Laboratorio.
- [x] Añadir `dateSourceMode` al informe agregado v9.
- [x] Añadir pruebas unitarias para modo por defecto, opt-in, procedencia, privacidad y límites de muestra.
- [x] Actualizar la versión PWA a caché v84, la entrada de aplicación a v74 y el informe agregado a v9; validar SDD/calidad y Playwright en el commit revisado `90c27fd8e997303560e888baa9976a8e6a9081ba`.
- [x] Fusionar el código en PR #66 (commit `26020dba10a2c7fa5241808a2a0e2cc50b5a39de`), promover requisitos permanentes y archivar el expediente.

## Evidencia de cierre

- Implementación y pruebas: [PR #66](https://github.com/ElFast-dev/Prisma/pull/66).
- Validación SDD/calidad de la revisión: [run 39724872763](https://github.com/ElFast-dev/Prisma/actions/runs/39724872763).
- Playwright de la revisión, incluye escritorio/móvil y el control opt-in: [run 39724872751](https://github.com/ElFast-dev/Prisma/actions/runs/39724872751).
- Fusión en main: `26020dba10a2c7fa5241808a2a0e2cc50b5a39de`.
- Validación SDD/calidad en main tras la fusión: [run 39725064467](https://github.com/ElFast-dev/Prisma/actions/runs/39725064467).

## Resultado y límites

La importación conserva `cH.a` como fecha de incorporación `addedAt`, con procedencia diferenciada. Solo tras activar el control del Laboratorio puede usarse esa fecha como proxy de evaluación temporal; todas esas filas se etiquetan como no verificadas y el resultado es exploratorio. No se modifica ni crea `watchedAt`, no se cambia el ranking de producción y el informe v9 solo expone agregados y el modo de fuente.