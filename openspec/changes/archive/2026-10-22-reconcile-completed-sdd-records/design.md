# Diseño técnico: reconciliación de expedientes SDD

1. Tomar el SHA actual de `main` como referencia de archivos y examinar el historial de PRs ya fusionados.
2. Validar que existan ejecuciones satisfactorias de calidad y Playwright para los cambios, y que un despliegue exitoso haya publicado un SHA probado que contenga el cambio.
3. Para cada expediente completo, actualizar su `tasks.md` archivado con los identificadores SHA/ejecución verificables y marcar las tareas solo cuando correspondan a acciones terminadas.
4. Copiar todos los artefactos del expediente al mismo árbol relativo bajo `openspec/changes/archive/`, conservando propuesta, diseño y deltas de especificación; eliminar las copias activas solo después de confirmar las copias archivadas.
5. No archivar un expediente cuyo despliegue no tenga evidencia suficiente. Mantener separado el expediente de reconciliación hasta que sus propios checks e integración estén completos.

## Riesgos y mitigación

- **SHA de despliegue distinto del último commit documental:** comparar ambos árboles. Si solo difiere la documentación SDD y el código publicado es idéntico, dejar explícita esa diferencia y ejecutar igualmente las comprobaciones del SHA actual.
- **Cierres adelantados:** usar la API de GitHub para comprobar estados merged y runs, no deducirlos a partir del título del PR.
- **Pérdida de historial:** mantener los paths originales dentro del directorio de archivo y no sobrescribir artefactos existentes.
