# Diseño técnico: identidad cinematográfica y procedencia temporal

## Identidad canónica

1. Si ambos registros tienen ID TMDB positivo, solo coincide el mismo ID.
2. Si falta algún ID, se requiere un título normalizado idéntico.
3. Cuando ambos tengan año válido, los años deben coincidir. Si solo uno aporta año, la comparación estricta no los fusiona.
4. Para enlazar un registro legado sin ID o año se permite un fallback contextual únicamente cuando el título tiene una sola candidata y no se detecta ningún conflicto de IDs o años. Si hay varios remakes potenciales, se conservan separados.
5. `movieIdentityKey` y el parser CSV incluyen el año cuando no hay ID. Una función compartida de correspondencia contextual sirve a la aplicación, importadores, catálogo e historial.

## Procedencia de fechas

- `watchedAtSource=action-time` no es evidencia suficiente de visionado real y se excluye de la presentación e historial de fechas.
- La acción deliberada «Marcar como vista» usa `watchedAtSource=user-confirmed` y `watchDateConfidence=user-confirmed` cuando no existe ya una fecha fiable que preservar.
- Fechas importadas explícitamente y confirmadas manualmente se mantienen sin cambios.
- No se convierte `updatedAt`, `rA` ni `addedAt` en un `watchedAt` ausente.

## Compatibilidad, pruebas y publicación

No se borra ni migra automáticamente información personal antigua. Los registros ambiguos se conservan hasta que haya metadatos suficientes. Las pruebas usan títulos y IDs sintéticos. Se invalidan URLs de módulos y la caché del service worker; calidad, Playwright y despliegue deben verificar el mismo SHA.
