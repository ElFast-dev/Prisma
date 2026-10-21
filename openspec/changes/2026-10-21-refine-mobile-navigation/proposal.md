# Propuesta: refinar la navegación móvil de Prisma

## Estado
Implementación en curso; pendiente de verificación CI y archivo.

## Contexto
La persona usuaria quiere que Prisma combine organización del historial, descubrimiento y recomendaciones. Para la siguiente etapa prioriza la interfaz, la navegación y la experiencia móvil, con interacciones minimalistas, privacidad local, SDD y entregas pequeñas. La revisión detectó que los destinos inferiores no garantizaban explícitamente objetivos táctiles mínimos y que el estado activo solo se comunicaba de forma visual.

## Objetivo
Hacer más fácil pulsar y comprender la navegación móvil sin añadir animaciones, dependencias ni almacenamiento remoto.

## Alcance
- Garantizar 48 px CSS de altura para destinos inferiores y 44 × 44 px CSS para acciones de icono de cabecera en móvil.
- Reducir las transiciones y eliminar la animación de escala de pulsación en dispositivos táctiles.
- Exponer `aria-current="page"` en el destino principal activo, incluidas las correspondencias Laboratorio→Progreso y Ajustes/Datos→Colección.
- Corregir la especificación que todavía describía el antiguo acento violeta.
- Documentar las preferencias de producto y actualizar pruebas/versiones de la PWA.

## Fuera del alcance
No se cambia el algoritmo de recomendaciones, el esquema de perfil, las funciones TMDB, la persistencia local ni la estructura principal de vistas. No se añade sincronización ni una dependencia de interfaz.

## Criterios de aceptación
- CSS móvil garantiza los tamaños táctiles y evita escala al pulsar en dispositivos táctiles.
- Después de renderizar, el destino principal activo se anuncia con `aria-current="page"`.
- La especificación permanente coincide con el tema negro y azul discreto vigentes.
- La prueba de regresión está conectada a CI y las URL CSS/JS y la caché PWA están sincronizadas.
