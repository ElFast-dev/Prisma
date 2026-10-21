# Tareas: acciones del modal y publicación bloqueada por pruebas

- [ ] MG1. Corregir todos los accesos al borrador en los manejadores con `ctx.modalDraft`.
- [ ] MG2. Añadir una prueba de integración del callback real para emociones y acciones de estado sin ficha activa.
- [ ] MG3. Añadir escenarios de Playwright que pulsen emoción, guarden la nota y verifiquen las listas desde una ficha.
- [ ] MG4. Encadenar calidad → Playwright local del mismo SHA → despliegue de ese mismo SHA.
- [ ] MG5. Retirar `validate.yml` duplicado y validar manifest en el workflow canónico.
- [ ] MG6. Probar estáticamente que un fallo de calidad o navegador bloquea Pages y que no hay bypass de publicación manual.
- [ ] MG7. Sincronizar caché PWA, documentar requisitos permanentes y ejecutar los tres checks en PR.
- [ ] MG8. Fusionar la implementación, archivar el expediente SDD y comprobar todos los checks de `main`.

## Criterios de aceptación
- Las emociones pueden activarse y desactivarse sin ReferenceError, y se almacenan al guardar la valoración.
- Pendientes, Vista y Ocultar llaman a la acción adecuada cuando solo existe un `modalDraft`; los registros resultantes corresponden a la identidad de película esperada.
- Un error en cualquier test del workflow canónico impide iniciar Playwright de `main`; un error de Playwright impide el despliegue.
- Pages solo publica el SHA probado, después de las dos etapas exitosas, sin trigger `push` directo.
- `validate.yml` ya no se ejecuta en paralelo duplicando sintaxis básica.
- Las comprobaciones de PR, PWA y SDD siguen activas.
