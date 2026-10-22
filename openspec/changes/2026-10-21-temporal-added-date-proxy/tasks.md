# Tareas: proxy temporal de fecha de incorporación

- [x] Identificar la forma real del JSON importado y distinguir `cH.a` (incorporación a colección), `rM.rA` (fecha asociada a valoración) y `watchedAt`.
- [x] Añadir marcador `addedAtSource = imported-collection` sin convertir `addedAt` a `watchedAt`.
- [x] Añadir un proxy diagnóstico opcional, desactivado por defecto, limitado a registros con procedencia de colección importada.
- [x] Mostrar el control y el aviso de resultado exploratorio en el Laboratorio.
- [x] Añadir `dateSourceMode` al informe agregado v9.
- [x] Añadir pruebas unitarias para modo por defecto, opt-in, procedencia, privacidad y límites de muestra.
- [ ] Actualizar versión PWA/CI y validar el PR con SDD, calidad y Playwright.
- [ ] Fusionar el código aprobado, promover requisitos permanentes y archivar el expediente.
