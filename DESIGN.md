# Prisma — guía UI/UX v2

## Objetivo del producto

Prisma es un recomendador de cine personal, no un clon de una plataforma de streaming. La pantalla principal debe resolver primero la pregunta «¿qué película podría gustarme hoy?»; las métricas, el mantenimiento y las credenciales son tareas secundarias.

## Dirección visual

- **Paleta:** carbón con matiz azul, fondos azul-negro, superficies pizarra y un único acento azul frío. Sin morado/lavanda. Verde menta solo para confirmaciones y conexión; dorado reservado a puntuaciones.
- **Carteles protagonistas:** que la imagen de la película aporte el color; evitar que brillos, bordes y chips compitan con ella.
- **Tipografía:** sans-serif de sistema, clara y actual, con tamaños y pesos diferenciados. Evitar titulares gigantes que empujen la utilidad por debajo del primer pliegue.
- **Superficies:** pocos paneles, bordes finos, contraste por agrupación y espacio, no una tarjeta por cada dato.
- **Privacidad visible, sin decoración excesiva:** indicar que el perfil se guarda en el dispositivo sin convertirlo en un gran banner.
- **Accesibilidad:** texto normal con contraste objetivo mínimo 4.5:1 (WCAG AA), estados de foco visibles, controles cómodos para pantalla táctil y respeto de `prefers-reduced-motion`.

## Arquitectura y orden de pantallas

### 1. Para ti
1. Titular breve y acción principal para descubrir películas; para perfiles vacíos, importar el historial.
2. Resumen personal compacto a un lado en escritorio y debajo de la acción en móvil: valoraciones y cobertura de metadatos.
3. Cuatro recomendaciones visibles, con acceso al catálogo completo.
4. Estadísticas de resumen al final; no antes del contenido recomendado.
5. Avisos de datos insuficientes solo cuando sean pertinentes.

### 2. Explorar
1. Búsqueda como control dominante.
2. Exploración de TMDB y resultados remotos.
3. Catálogo local, filtros por género y estado de resultados.
4. Importación del catálogo como acción secundaria.

### 3. Mi lista
1. Películas pendientes primero.
2. Historial de valoraciones después.
3. Métricas del perfil como contexto, no como protagonista.

### 4. Laboratorio
- Separar observaciones, hipótesis del motor y evaluación experimental.
- Dar más protagonismo al progreso de metadatos y explicar limitaciones de muestra.
- Mantener el enriquecimiento de historial TMDB aquí, no en la navegación principal.

### 5. Datos
- Ajustes de TMDB, importación, ampliación del catálogo, copia de seguridad y acciones destructivas.
- Agrupar operaciones avanzadas en paneles sencillos y describir claramente el efecto de cada una.

## Navegación adaptativa

- **Android / pantallas estrechas:** cinco destinos visibles en barra inferior fija, iconos de línea y etiquetas breves.
- **Escritorio:** barra horizontal compacta bajo la cabecera que permanece visible al desplazarse.
- No esconder destinos principales detrás de un menú hamburguesa cuando caben cinco.

## Movimiento y estados

- Entradas de vista breves; hover solo en dispositivos con puntero.
- Animar principalmente opacidad y transformaciones pequeñas, nunca el contenido esencial ni acciones que obliguen a esperar.
- Respetar `prefers-reduced-motion`.
- Todos los resultados deben comunicar carga, estado vacío y error cuando corresponda.
- No tratar predicciones de aprendizaje automático como certezas.

## Investigación de referencia

- Apple Human Interface Guidelines, principios: propósito, simplicidad, jerarquía y adaptación al contexto. https://developer.apple.com/design/human-interface-guidelines/design-principles
- Apple Human Interface Guidelines, movimiento: animación con propósito, breve y opcional. https://developer.apple.com/design/human-interface-guidelines/motion
- Android Developers, navegación adaptable: de tres a cinco destinos principales y adaptación a ventanas grandes. https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns
- Nielsen Norman Group, modo oscuro: cuidar grosor tipográfico, contraste y uso del color; el modo oscuro no soluciona por sí solo la usabilidad. https://www.nngroup.com/articles/dark-mode-users-issues/
- Nielsen Norman Group, jerarquía visual: usar contraste, escala y agrupación para guiar la atención. https://www.nngroup.com/articles/visual-hierarchy-ux-definition/
- W3C WCAG 2.2, contraste mínimo: 4.5:1 para texto normal y 3:1 para texto grande. https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- MDN, `prefers-reduced-motion`: respetar la preferencia del sistema por reducir animaciones no esenciales. https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion

## Alcance de la iteración v2

Actualiza la paleta, la jerarquía de Inicio y la navegación adaptativa sin cambiar el formato de las valoraciones, la lógica del recomendador, los respaldos ni el almacenamiento personal. La prueba automatizada de GitHub Actions verifica que la versión CSS esperada se cargue desde GitHub Pages y toma capturas reales de escritorio y móvil.
