# Propuesta: orientar a quien empieza en Progreso

## Estado

Aceptado tras revisión técnica delegada el 2026-10-20 y archivado. La guía de primera visita y sus dos destinos se verificaron en escritorio y móvil; también se comprobó que desaparece después de guardar una valoración válida.

## Problema observado

En una instalación sin valoraciones, la vista Progreso muestra métricas en cero y el panel de géneros ofrece únicamente «Completar datos». No explica el paso más útil para empezar a entrenar el recomendador ni ofrece una ruta directa a valorar películas o importar el historial.

## Alcance

- Mostrar una guía de primera ejecución breve cuando el perfil no tenga valoraciones válidas.
- Ofrecer dos destinos explícitos: explorar películas y calificar algunas, o importar el historial personal.
- Ocultar la guía cuando exista al menos una valoración válida.
- Cubrir presencia, navegación y desaparición con pruebas de navegador en tamaños de escritorio y móvil.

## Fuera de alcance

- No cambiar el algoritmo, puntuaciones predichas ni los metadatos.
- No añadir tutoriales de varias pantallas, cuentas, servidor ni dependencias.
- No leer, cambiar o migrar datos personales fuera del uso normal de la aplicación.
- No mostrar la guía a perfiles que ya tienen valoraciones válidas.

## Criterios de aceptación

1. Un perfil sin valoraciones válidas ve una guía discreta en Progreso con acciones para explorar películas e importar historial.
2. «Explorar películas» abre Descubrir y «Importar historial» abre Ajustes/Datos.
3. Tras guardar una valoración válida, la guía ya no aparece en Progreso.
4. La guía mantiene la paleta oscura azul y se acomoda al ancho móvil sin controles cortados.
5. Los workflows de SDD, sintaxis y navegador pasan en el commit final.
