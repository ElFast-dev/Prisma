# Diseño: backend privado y agente de desarrollo

## Estado de las decisiones

- Confirmado: conservar la PWA y los módulos actuales como cliente inicial.
- Confirmado: añadir sincronización privada solo después de autenticación y autorización explícitas.
- Candidato por evaluar: Supabase (PostgreSQL, autenticación y funciones gestionadas).
- Pendiente: comparar proveedores, costes, región, backups, disponibilidad, límites, runtime del agente y credenciales disponibles.
- No decidido: usar un plan gratuito o de pago. No activar facturación automáticamente.

La documentación oficial de Supabase exige políticas Row Level Security y permisos mínimos en tablas expuestas; las claves secretas administrativas omiten RLS y deben permanecer exclusivamente en el servidor. Su plan gratuito puede pausar proyectos tras una semana de inactividad, por lo que no debe asumirse disponibilidad continua sin evaluar ese límite. Fuentes: https://supabase.com/docs/guides/database/row-level-security, https://supabase.com/docs/guides/database/secure-data, https://supabase.com/docs/guides/platform/billing-on-supabase, https://supabase.com/pricing.

## Situación actual inspeccionada

- docs/architecture.md describe una aplicación estática modular.
- js/core/storage.js almacena estado, catálogo personalizado y credencial TMDB en IndexedDB y usa localStorage como fallback.
- js/import-export/actions.js exporta un respaldo que contiene estado y catálogo; es dato privado y no debe convertirse en artefacto CI.
- js/diagnostics/recommendation-report.js genera el diagnóstico agregado v14 y recommendation-handoff.js prepara un resumen para transferencia manual. Que exista un informe agregado no implica permiso para enviarlo por red.
- quality.yml usa pruebas sintéticas; deploy-pages.yml publica solo tras la cadena de calidad y Playwright y comprueba que el SHA siga siendo el actual de main.
- openspec/specs/privacy-storage/spec.md exige actualmente almacenamiento local sin envío automático. Esta regla debe cambiarse explícitamente para habilitar sincronización autorizada.

## Arquitectura lógica propuesta

### Plano A: cliente Prisma

La PWA sigue siendo la interfaz móvil y permite calificar y consultar datos disponibles sin conexión. El almacenamiento local conserva una copia utilizable y una cola de operaciones pendientes. La nube no es requisito para abrir la app.

Al conectar una cuenta, una migración versionada compara el estado local y remoto antes de escribir. La primera sincronización informa qué categorías se copiarán y valida los recuentos. Tras esa autorización, los cambios se sincronizan automáticamente cuando la aplicación está activa y conectada. No se promete enviar cambios hechos en un navegador cerrado que todavía no han llegado a la red.

### Plano B: API y almacenamiento privado

El backend expone contratos versionados, no acceso genérico a la base de datos. El esquema debe derivarse de docs/data-model.md y el estado normalizado real, distinguiendo perfil, valoraciones, vistas, pendientes, ocultas, versiones de sincronización, borrados, trabajos y resultados.

Cada fila personal tiene un propietario autenticado. Las políticas de autorización deniegan acceso cruzado entre cuentas; los permisos SQL se limitan además de las políticas. Las funciones administrativas usan secretos del lado servidor. Ninguna clave secreta o service_role se empaqueta en JavaScript, Git, logs o prompts.

### Plano C: trabajos de análisis personal

El backend registra cada trabajo con ID, tipo permitido, versión del código/modelo, estado, límites, tiempos y resultado. El worker valida origen, propietario, tipo y límites antes de ejecutar.

Los experimentos que requieren historial y características reales se ejecutan en un entorno privado controlado. El historial no se descarga a runners ordinarios de GitHub Actions ni se adjunta como artefacto. El trabajo devuelve métricas emparejadas, cobertura, errores y diagnósticos agregados; títulos, notas por película, IDs del historial, fechas exactas y predicciones individuales quedan fuera del resultado destinado al agente.

### Plano D: agente y GitHub

Se separan dos capacidades:

1. Agente de repositorio: inspecciona código y especificaciones, modifica archivos en ramas y abre PR usando permisos de GitHub acotados. No recibe credenciales de base de datos ni registros personales individuales.
2. Worker de datos: ejecuta tareas permitidas y devuelve resultados sanitizados. No puede modificar el repositorio ni desplegar código.

Un coordinador enlaza ambos planos mediante IDs de trabajo y contratos versionados. Títulos, sinopsis, comentarios importados y otros contenidos del perfil son datos no confiables, nunca instrucciones para el agente.

GitHub Actions ejecuta SDD, sintaxis, tests sintéticos, escaneo de secretos y Playwright. Los workflows privilegiados no ejecutan código no confiable y los artefactos CI no contienen datos personales. El runtime del agente es un componente separado: GitHub Actions por sí solo ejecuta automatizaciones, pero no proporciona una IA desarrolladora ni sus credenciales de modelo.

### Eventos y observabilidad

Se registran eventos técnicos necesarios: versión desplegada, errores de API sin payload privado, fallos de sincronización codificados, duración y estado de trabajos, cobertura y métricas agregadas. No se recopilan indiscriminadamente clics, texto escrito, notas por título ni navegación individual.

La observabilidad muestra si la app sincroniza, si hay trabajos pendientes/fallidos y qué versión evaluó. No significa grabar literalmente cada interacción de la persona.

## Contrato de sincronización

- Cada operación usa schemaVersion, identidad estable y revisión o mecanismo equivalente.
- Los reintentos son idempotentes: no duplican películas ni eventos.
- Los fallos de red conservan la operación local y reintentan con backoff.
- Los conflictos usan reglas explícitas, no último escritor ciego. Las notas, fechas confirmadas e identidad TMDB no se reemplazan por valores vacíos o inferidos.
- Los borrados se sincronizan explícitamente para no resucitar registros borrados desde una copia antigua.
- La migración tiene validación previa, recuentos antes/después, versión y recuperación.
- La persona puede exportar sus datos y solicitar el borrado remoto. El borrado de cuenta no se delega a una decisión autónoma del agente.

## Límites de las operaciones autónomas

Automatizables una vez configurados los permisos: leer estado técnico y métricas agregadas, ejecutar jobs permitidos, repetir tests sintéticos, crear ramas y PR, corregir fallos en una rama y publicar solo a través del pipeline existente.

Requieren una compuerta separada: crear recursos facturables o elevar límites, ampliar permisos/secrets, cambiar políticas de acceso o retención, exponer nuevos datos personales al agente, borrar datos, migraciones irreversibles y cambiar el modelo activo. Las operaciones reversibles pueden automatizarse con criterios verificables, sin dar al agente permisos de administrador global.

## Comparación de proveedores antes de implementar

Comparar Supabase y al menos una alternativa gestionada (por ejemplo, Cloudflare Workers + D1), usando documentación oficial vigente. Evaluar autenticación y aislamiento por usuario, transacciones y migraciones, trabajos/eventos, backups y recuperación, región, costes para la disponibilidad objetivo, límites gratuitos, exportación, bloqueo de proveedor y pruebas locales. No inventar el coste final ni crear infraestructura durante esta fase.

## Orden de implementación posterior

1. Elegir proveedor y revisar costes y privacidad.
2. Definir esquema, migraciones y contratos API con datos sintéticos.
3. Implementar autenticación, permisos mínimos y pruebas de aislamiento.
4. Añadir sincronización incremental, reintentos, idempotencia, conflictos y borrados.
5. Añadir monitorización y API de diagnósticos limitada.
6. Añadir worker privado y verificar resultados sanitizados.
7. Conectar el runtime del agente y los workflows sin darle acceso a datos crudos.
8. Probar migración, recuperación y reversión antes de conectar el perfil real.
9. Ejecutar evaluación personalizada en el entorno privado y decidir con resultados agregados.

## Fuentes técnicas

- Supabase RLS: https://supabase.com/docs/guides/database/row-level-security
- Supabase secure data: https://supabase.com/docs/guides/database/secure-data
- Supabase billing: https://supabase.com/docs/guides/platform/billing-on-supabase
- Supabase pricing: https://supabase.com/pricing
- GitHub Actions security: https://docs.github.com/en/actions/reference/security/secure-use
- Cloudflare D1 data location: https://developers.cloudflare.com/d1/configuration/data-location/
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
