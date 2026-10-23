# Propuesta: impedir despliegues obsoletos de GitHub Pages

## Problema

Las ejecuciones de Playwright de commits diferentes de `main` pueden terminar en distinto orden. El deploy verifica actualmente que el artefacto de aprobación contiene un SHA válido y despliega ese SHA exacto, pero una aprobación más antigua que finalice tarde podría publicar una versión anterior después de una versión nueva.

## Cambio propuesto

- Comparar el SHA aprobado por Playwright con el head actual de `main` al validar el artefacto.
- Omitir checkout, preparación y despliegue de Pages cuando el SHA ya esté obsoleto.
- Volver a comprobar el head de `main` inmediatamente antes de ejecutar el paso de publicación.
- Proteger este comportamiento mediante regresiones estáticas del gate y un requisito SDD permanente.
