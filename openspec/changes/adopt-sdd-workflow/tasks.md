# Tareas: adoptar SDD

- [x] Revisar README, app.js, index.html, styles.css, sw.js y workflow de despliegue existentes.
- [x] Registrar el contexto del producto y la arquitectura observada.
- [x] Documentar la forma del estado local, las claves de persistencia y el formato de copia de seguridad.
- [x] Añadir especificaciones de referencia de las capacidades principales y limitaciones conocidas.
- [x] Definir las reglas permanentes y el formato de expediente para los futuros cambios.
- [x] Añadir validación de artefactos SDD y sintaxis JavaScript en GitHub Actions.
- [x] Confirmar en GitHub Actions que los checks de sintaxis JavaScript y validación SDD pasan en esta revisión.
- [ ] Revisar el expediente con el usuario y actualizar los documentos si el workflow detecta discrepancias.
- [ ] Registrar el resultado final de convergencia y archivar este cambio después de su aceptación.

## Evidencia y límites

El código base se inspeccionó mediante los archivos versionados. La adopción del flujo SDD no alteró la lógica de ejecución; un cambio piloto acotado añadió la preservación de IDs TMDB en CSV. GitHub Actions pasó SDD and static quality (run #19), Validate Prisma (run #126) y Prisma UI screenshots (run #97). La CI verifica sintaxis, estructura documental, parser CSV y un flujo de navegador; no acredita automáticamente todos los casos de la aplicación. La PR permanece en borrador y el expediente de adopción no se archiva hasta la revisión y aceptación.
