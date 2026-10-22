# Diseño técnico

El grupo `github-pages` se conserva para serializar ejecuciones, pero `cancel-in-progress` pasa a `false`. Así, un evento de `workflow_run` que no satisface la condición del job puede terminar como omitido sin cancelar una publicación activa. Si entran varios workflows, la concurrencia de GitHub conserva un único trabajo activo y gestiona los pendientes; la condición del job sigue impidiendo desplegar desde eventos no aprobados.

La prueba `scripts/test-release-gating.mjs` debe asegurar conjuntamente que:

- La condición del job exige conclusión `success` y evento original `workflow_run`.
- Se descarga `prisma-published-ui-screenshots`, se valida el SHA como cuarenta caracteres hexadecimales y el checkout usa el SHA probado.
- El grupo de concurrencia Pages tiene `cancel-in-progress: false`.

No se añade un bypass manual ni se cambia la publicación a pushes directos. No se cambia el contenido del sitio en esta propuesta; el objetivo es que una aprobación válida no se pierda por un evento concurrente sin aprobación.