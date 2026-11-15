# Prisma — Requisitos maestros

## Producto

Prisma es una aplicación cinematográfica personal, local-first y gratuita, con tres secciones principales: Personal, Descubrir y Espectro.

La PWA está orientada primero a Android. No habrá cuentas obligatorias, perfiles públicos, sincronización en la nube ni backend propio.

## Personal

Apartados:
- Mi perfil.
- Biblioteca.
- Historial.
- Colecciones.

Biblioteca contiene películas con estado actual Vistas o Pendientes y un atributo Favorita independiente. Tiene modos Cuadrícula y Lista. El modo Lista no existe en Descubrir.

Historial almacena cada experiencia con película, fecha obligatoria, calificación obligatoria de 1 a 10 estrellas, hora opcional y comentario opcional. Una película puede tener varios visionados. Las secuencias no se reutilizan.

Vistas y Pendientes son mutuamente excluyentes. Mover entre listas no elimina el historial. Registrar un nuevo visionado cambia la clasificación a Vistas. Los cambios importantes deben poder confirmarse y deshacerse.

Colecciones agrupan películas de forma personal. Eliminar una colección no elimina las películas.

Mi perfil contiene identidad personal, estadísticas y logros privados.

## Descubrir

La pantalla inicial tiene una barra de búsqueda unificada con filtros y ajustes. El Feed muestra exclusivamente carátulas, sin títulos, géneros, años ni etiquetas. Presentación de dos columnas en móviles. No existe modo Lista.

## Ficha cinematográfica

Orden:
1. Carátula completa con volver, menú y título superpuesto.
2. Año, géneros, duración y estado cinematográfico.
3. Acciones Vistas y Pendientes.
4. Sinopsis expandible y Calificar.
5. Reparto y Equipo, con Dirección, Escritores y Música.
6. Dónde ver.
7. Podría gustarte mediante carátulas.

Calificar permite consultar y editar experiencias concretas o registrar otro visionado. No hay una calificación única mutable en la película.

## Espectro

Algoritmo propio y local para analizar géneros, autores, reparto, países, épocas e historial de calificaciones. No inventa afinidades con datos insuficientes y explica recomendaciones.

## Privacidad y almacenamiento

IndexedDB es la fuente de verdad de los datos personales. Las imágenes y recursos externos se almacenan por separado. Se solicitan permisos de almacenamiento persistente cuando el navegador lo admite. Habrá exportación e importación manuales y validadas.

## TMDB

La autorización específica facilitada por el propietario permite a Prisma usar metadatos, imágenes, caché y disponibilidad de streaming, además de distribuir versiones gratuitas públicas sin monetización ni atribución adicional, de acuerdo con la comunicación recibida. La prueba original permanece privada.

Cada instalación configurará su propia credencial. Nunca se publicará una clave compartida. Un cliente web no puede proteger la credencial como un secreto de servidor.

## Identidad visual

Oscura, cinematográfica, minimalista, con fondo #0E1117, superficies #171D26 y #222B37, texto #F1EEE8 y acento #D9BD91.

## Distribución

Repositorio público y distribución gratuita. La licencia del código fuente aún está pendiente de decisión y es independiente de la autorización de TMDB.
