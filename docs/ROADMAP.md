# Hoja de ruta

## Etapa actual: integración de catálogo y ficha cinematográfica

- [x] Repositorio público inicializado.
- [x] Configuración React, TypeScript y Vite.
- [x] Navegación inicial de tres secciones.
- [x] Primera estructura de pantallas.
- [x] Esquema inicial Dexie.
- [x] Reglas iniciales de visionado.
- [x] Cliente base TMDB sin credenciales.
- [x] Configuración PWA y CI inicial.

## Entregas

- [x] 1. Conexión TMDB personal configurada desde Ajustes.
- [x] 2. Descubrir con tendencias, búsqueda y paginación progresiva.
- [x] 3. Ficha cinematográfica con metadatos, reparto, equipo, recomendaciones y disponibilidad por región.
- [x] 4. Guardado de películas y estados en IndexedDB.
- [x] 5. Registro, edición y eliminación de visionados desde la ficha.
- [x] 6. Historial con calendario mensual, edición y eliminación de experiencias.
- [x] 7. Estadísticas personales derivadas del historial: películas, visionados, tiempo y rachas.
- [x] 8. Colecciones, perfil editable y logros.
- [x] 9. Espectro por versiones (v1.0 local, afinidades, evolución y candidatas explicadas).
- [x] 10. Copias de seguridad validadas (exportación e importación local JSON).
- [x] 11. Preparación offline y publicación de GitHub Pages (app shell, caché limitada de imágenes, estado de conexión e iconos Android).
- [x] 12. Prueba manual en Android completada: actualización instalada, apertura en modo avión y navegación de datos guardados verificadas en el teléfono.

### Criterios offline y Android

- La aplicación y sus recursos esenciales se precargan para abrir su shell sin red.
- Las imágenes TMDB se guardan en caché con límites para cuidar el almacenamiento.
- La aplicación informa cuándo no hay conexión y cuándo Descubrir usa datos antiguos.
- Al recuperar conexión, Descubrir solicita datos actualizados.
- El manifiesto incluye iconos PNG estándar y una versión adaptable (maskable).
- La comprobación real de instalación y modo avión debe completarse en un Android físico.

### Criterios de copias de seguridad

- Archivo JSON versionado, con estructura estricta y relaciones validadas.
- Exportación de biblioteca, visionados, colecciones, perfil, preferencias y región.
- Restauración transaccional, precedida por validación y confirmación explícita.
- Credencial TMDB excluida y preservada al restaurar.
- Cachés regenerables excluidas del archivo.

### Criterios de Espectro

- Algoritmo local versionado con huella de entrada e instantáneas separadas.
- Afinidades con soporte mínimo y explicaciones visibles.
- Evolución mensual respaldada por visionados reales.
- Candidatas no vistas puntuadas por coincidencias de género.

### Criterios del perfil y los logros

- Perfil local editable: nombre, descripción, frase personal e imagen.
- Imagen limitada a formatos JPG, PNG o WebP y almacenada únicamente en IndexedDB.
- Logros calculados desde estadísticas y colecciones locales, sin servicios externos.

## Regla

No se considera funcional una pantalla solo por existir visualmente. Cada módulo requiere criterios de aceptación y pruebas.
