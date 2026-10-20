# Diseño: adopción del flujo SDD

## Enfoque

Usar documentos Markdown que se puedan leer desde GitHub y un script de validación con Node.js integrado en GitHub Actions. La estructura toma del ciclo de OpenSpec los expedientes por cambio y las especificaciones vigentes, y de Spec Kit la separación entre requisitos, plan, tareas y convergencia. No se mantienen dos instalaciones de herramientas paralelas.

## Flujo de trabajo

1. Inspección del código y documentación relacionada.
2. Propuesta y alcance en proposal.md.
3. Escenarios delta en specs/<capability>/spec.md cuando cambie comportamiento.
4. Diseño y riesgos en design.md.
5. Tareas ordenadas y relacionadas con los requisitos en tasks.md.
6. Implementación dentro del alcance autorizado.
7. Pruebas automáticas y manuales con resultado explícito.
8. Actualización de openspec/specs/ y archivo del expediente solo después de satisfacer los criterios de cierre.

## Validación automática inicial

El workflow ejecuta dos controles que no necesitan instalar dependencias de la aplicación:

- node --check app.js: detecta errores sintácticos de JavaScript.
- node scripts/validate-sdd.mjs: verifica la presencia de los documentos requeridos, los encabezados de requisitos y la existencia de escenarios asociados.

Estos controles NO sustituyen tests de lógica, pruebas de integración, validación visual en móvil ni pruebas de aceptación. Cada cambio deberá añadir los checks necesarios para su riesgo.

## Privacidad

La CI no carga copias de seguridad ni credenciales. No requiere secretos. Las futuras pruebas utilizarán datos sintéticos y no se conectarán a TMDB en el flujo ordinario.

## Compatibilidad

No se cambian dependencias, estructura de ejecución del navegador, nombres de almacenamiento, service worker, metadatos ni el despliegue actual de Pages. La publicación y la calidad quedan en workflows separados.
