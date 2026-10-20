# ADR 0001: SDD ligero y versionado para Prisma

- Estado: propuesto en la rama de adopción SDD.
- Fecha: 2026-10-20.
- Decisión: usar artefactos Markdown con estructura inspirada en OpenSpec, reforzados por comprobaciones automáticas de calidad inspiradas en el proceso de GitHub Spec Kit.

## Contexto

Prisma ya es una aplicación en funcionamiento. Introducir una CLI obligatoria, múltiples herramientas SDD o una migración técnica extensa no aporta valor antes de tener documentados los comportamientos y riesgos del producto. El flujo también debe poder revisarse desde GitHub en un móvil.

## Decisión

- Mantener las especificaciones vigentes en `openspec/specs/`.
- Mantener cada cambio en `openspec/changes/<slug>/`, con propuesta, especificación delta cuando aplique, diseño y tareas.
- Actualizar las especificaciones vigentes después de verificar un cambio; archivar el expediente solo cuando esté cerrado.
- Mantener reglas de producto y arquitectura en `docs/`.
- Ejecutar validaciones ligeras mediante GitHub Actions sin instalar dependencias npm de aplicación.
- Usar tests adicionales de navegador o lógica cuando una funcionalidad lo requiera; los checks estáticos no se presentarán como pruebas de comportamiento.

## Alternativas consideradas

### Instalar OpenSpec CLI de inmediato

Se descarta como requisito obligatorio inicial: los archivos Markdown versionados deben ser suficientes para revisar el flujo desde Android y no debemos introducir una herramienta antes de auditar los requisitos actuales.

### Instalar simultáneamente OpenSpec y Spec Kit

Se descarta porque duplica estructuras y ciclos de trabajo. Se adopta el formato de cambios y especificaciones de OpenSpec y se añaden comprobaciones de coherencia y convergencia inspiradas en Spec Kit sin mantener dos sistemas paralelos.

### Crear solo una constitución sin especificaciones de comportamiento

Se descarta porque no describe qué debe preservar y verificar la aplicación en cada cambio.

## Consecuencias

- Las propuestas y tareas serán trazables en Git.
- Los checks automáticos comprobarán existencia y estructura de los artefactos, así como sintaxis JavaScript.
- Será necesario añadir pruebas de comportamiento gradualmente; la primera validación no prueba por sí sola las interacciones reales del navegador.
- Si el código contradice una especificación, el agente debe hacer visible la discrepancia y resolverla, no actualizar la especificación silenciosamente para justificar un defecto.
