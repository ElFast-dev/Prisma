# Propuesta: backend privado y autonomía operativa de Prisma

## Motivación

Prisma es una PWA estática publicada en GitHub Pages. El perfil personal se guarda en IndexedDB, con respaldo de localStorage. GitHub y GitHub Actions pueden inspeccionar el código y ejecutar comprobaciones, pero no pueden leer por sí solos el almacenamiento privado del navegador. Esta separación impide ejecutar automáticamente algunos experimentos personalizados y obliga a copiar diagnósticos manualmente.

La decisión de avanzar a una arquitectura con backend se ha tomado explícitamente. Debe eliminar el flujo manual sin convertir el historial personal en contenido del repositorio ni cambiar prematuramente el recomendador.

## Objetivo

Diseñar y desplegar por fases una infraestructura que permita sincronizar el perfil mediante una autorización inicial, mantener la PWA utilizable desde Android y habilitar a un agente para observar el estado técnico, ejecutar comprobaciones, evaluar experimentos y proponer/publicar mejoras verificadas con intervención mínima en las tareas rutinarias.

## Alcance de este expediente

- Definir arquitectura objetivo, límites de confianza, modelo de permisos y contrato de sincronización.
- Evaluar un backend gestionado; Supabase es candidato inicial, no una dependencia aprobada hasta comparar capacidades, costes actuales, disponibilidad, región, límites y facilidad de migración.
- Separar los datos personales del desarrollo del código y del agente.
- Especificar sincronización autenticada, informes agregados, trabajos de evaluación y trazabilidad.
- Definir fases y criterios de seguridad, recuperación, pruebas y publicación automática.
- Preparar criterios de aceptación para las siguientes fases.

Esta primera fase es documental. No crea un proyecto externo, no añade credenciales, no migra datos y no cambia producción. La implementación posterior requiere su propio alcance técnico y los recursos y permisos disponibles.

## No negociables

1. El perfil y el catálogo personal nuevos continúan vacíos; no se insertan películas de muestra al configurar el backend.
2. La aplicación conserva funcionamiento local y recuperación/exportación; una caída del servicio no debe borrar datos ni bloquear el uso básico.
3. La sincronización del perfil existente empieza únicamente después de autorización inicial, clara y autenticada. No se envían datos personales silenciosamente.
4. El historial real, las notas individuales, IDs de películas vinculados al historial, respaldos y credenciales no aparecen en el repositorio, logs de CI, artefactos de workflow, issues ni prompts generales del agente.
5. El agente no recibe credenciales administrativas de base de datos ni acceso SQL irrestricto. Las operaciones pasan por APIs limitadas y auditables.
6. Los experimentos que necesiten historial real se procesan en un entorno privado controlado; el agente recibe métricas agregadas sanitizadas.
7. CI usa datos sintéticos. Las evaluaciones con perfil real no se mezclan con los tests ordinarios ni publican datos personales como artefactos.
8. El modelo aditivo actual permanece en producción hasta que una propuesta independiente cumpla los criterios de evaluación.
9. El agente no puede autoaprobar cambios destructivos, ampliar permisos o secrets, generar gastos no acotados ni borrar datos personales por decisión propia.
10. Un diseño o check sintético nunca se presenta como evaluación ejecutada con el perfil personal.

## Fuera del alcance inicial

- Reescribir Prisma como app nativa.
- Cambiar el motor de recomendaciones o activar Ridge.
- Recopilar todos los clics, textos escritos o interacciones sin necesidad concreta.
- Subir un respaldo personal a GitHub o usarlo como fixture.
- Dar permisos globales de propietario al agente.
- Contratar servicios, activar pagos o fijar un presupuesto sin comparar alternativas.
- Prometer ejecución continua cuando el runtime del agente o el entorno autorizado no esté disponible.

## Criterios de aceptación del diseño

- La arquitectura diferencia PWA, API/backend, almacenamiento privado, worker de evaluación, runtime del agente y GitHub Actions.
- Se documentan los datos sincronizados, los procesados solo localmente y los resultados consultables por el agente.
- Se especifican autenticación, autorización por usuario, políticas de filas, secretos, límites, borrado/exportación y recuperación.
- La sincronización cubre offline, reintentos, versiones y conflictos sin sobrescribir notas ni fechas silenciosamente.
- Los trabajos son idempotentes y trazables y devuelven métricas agregadas, estado y errores.
- La alternativa de proveedor se decide con datos vigentes y coste estimado; no se crea infraestructura en esta fase.
- La migración tiene validación y recuperación antes de escribir el perfil real en la nube.
- Se conservan los workflows de calidad y despliegue sin caminos que eviten sus compuertas.
