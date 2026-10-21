# Diseño: solicitud explícita de persistencia

## Decisiones

- Crear `js/core/storage-protection.js` con una interfaz pequeña e independiente del DOM. Recibe `navigator.storage` como dependencia para poder probar resultados concedidos, denegados, no admitidos y errores.
- La comprobación inicial es de solo lectura: `persisted()` y `estimate()` cuando existen. Nunca ejecuta `persist()` durante el arranque.
- La acción de usuario invoca `persist()` inmediatamente, antes de cualquier espera asíncrona previa, para conservar la activación de usuario cuando el navegador la requiera.
- La interfaz de Ajustes refleja el estado devuelto por el navegador y el uso/cuota estimados solo si esos números están disponibles.
- Un resultado denegado o un error no bloquea el uso normal de Prisma. Una persistencia concedida reduce el riesgo de expulsión automática, pero no reemplaza exportar una copia, no impide un borrado explícito del almacenamiento y no cambia las limitaciones de una sesión privada.
- Se añade la nueva API a las comprobaciones de modularidad y al inventario de la caché PWA. Se versiona `app.js` y se incrementa el shell de caché.

## Verificación

Las pruebas usan un objeto `StorageManager` simulado y comprueban que inspeccionar no pide persistencia, que la petición requiere una invocación explícita, que los estados concedido/denegado/no admitido/error son seguros y que el flujo no exige credenciales TMDB ni datos personales reales.
