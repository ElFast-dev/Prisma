# Diseño: gate anti-regresión de GitHub Pages

## Flujo

1. Descargar el artefacto `prisma-published-ui-screenshots` de la ejecución de Playwright exitosa y validar que `tested-sha.txt` contiene un SHA hexadecimal de 40 caracteres.
2. Consultar `refs/heads/main` con `git ls-remote`. Si no se puede determinar un SHA válido, fallar de forma segura; si no coincide con el SHA probado, registrar `is_current=false` y omitir los pasos restantes.
3. Solo para el SHA actual, hacer checkout del commit exacto, configurar Pages y preparar el artefacto estático.
4. Volver a consultar el head de `main` justo antes de publicar. Si avanzó durante la preparación, omitir la publicación.
5. Mantener la cadena de aprobación existente: calidad y Playwright del mismo SHA, sin trigger directo por push ni bypass manual.

## Alcance

El cambio afecta el workflow de despliegue, su prueba estática y la especificación del proceso de publicación. No modifica la aplicación publicada ni sus datos.
