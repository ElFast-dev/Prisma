# Tareas: validación del recomendador

- [x] R1. Corregir la búsqueda de cada película retenida usando su ID TMDB cuando esté disponible.
- [x] R2. Calcular MAE del motor y MAE base con los mismos pliegues, e informar la mejora relativa cuando esté definida.
- [x] R3. Actualizar el laboratorio para explicar la comparación y el umbral mínimo de la muestra.
- [x] R4. Añadir pruebas sintéticas de remakes, comparación, muestra insuficiente y referencia de error cero.
- [x] R5. Ejecutar checks SDD, sintaxis y regresión visual; actualizar las especificaciones vigentes y archivar el cambio solo si todo pasa.

## Evidencia de verificación

- SDD y calidad estática: correcto, [workflow 39495712845](https://github.com/ElFast-dev/Prisma/actions/runs/39495712845).
- Validación del proyecto: correcta, [workflow 39495712911](https://github.com/ElFast-dev/Prisma/actions/runs/39495712911).
- Regresión visual Playwright en escritorio y móvil: correcta, [workflow 39495712683](https://github.com/ElFast-dev/Prisma/actions/runs/39495712683).
- Sin datos personales ni credenciales; pruebas solo con registros sintéticos.

## Cierre

El MAE y la referencia usan las mismas películas retenidas. La métrica relativa no se calcula cuando la referencia ya tiene error cero, y la UI identifica la evaluación como experimental.
