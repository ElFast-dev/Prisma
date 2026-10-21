# Diseño: navegación móvil accesible y ligera

## Enfoque
Añadir reglas puntuales al módulo CSS responsivo existente y hacer que el renderizador de páginas actualice la semántica del destino activo junto con la clase visual. Se conservan HTML, CSS y JavaScript nativos.

## Comportamiento
- En viewports de hasta 760 px, los controles de icono de cabecera tendrán 44 × 44 px CSS.
- Cada destino inferior tendrá una altura mínima de 48 px CSS.
- Las transiciones visuales de la navegación durarán 120 ms y la pulsación con puntero táctil no aplicará escala.
- El renderizador asignará `aria-current="page"` al destino activo y lo quitará de los otros destinos. Laboratorio se representa en Progreso y Ajustes/Datos en Colección.

## Compatibilidad, accesibilidad y rendimiento
No cambia el modelo de datos ni se guardan preferencias nuevas. Se conserva el tema oscuro negro, el acento azul discreto y el modo claro opcional. El comportamiento no depende de hover, no se incorpora JavaScript de animación y no se instalan dependencias. Se actualizan las URL versionadas de CSS, el módulo de vistas, la aplicación y el shell PWA para evitar recursos antiguos en caché.

## Verificación
La prueba específica comprueba contratos CSS, semántica de navegación, correspondencia entre vistas, preferencias de producto y coherencia de versiones. La suite CI valida además la arquitectura modular, SDD y los recursos PWA. Los resultados deben registrarse antes de archivar el expediente.
