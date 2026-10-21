# Endurecer la actualización de la PWA

## Why

La eliminación del catálogo de muestra ya está publicada y las pruebas del sitio verifican que una instalación nueva no muestra la ficha predeterminada de «About Time». Una página que permanece abierta bajo el service worker anterior puede seguir ejecutando JavaScript antiguo hasta que se recargue. La actualización debe detectar versiones nuevas y avisar sin descartar cambios de interfaz ni tocar datos persistidos.

## Scope

- Comprobar actualizaciones del service worker sin depender de su caché HTTP.
- Detectar cambios de controlador en páginas abiertas y ofrecer un aviso accesible con acción explícita para recargar.
- Mantener silenciosa la primera instalación y tolerar navegadores sin soporte de service worker.
- Probar aviso, recarga y compatibilidad con datos personales; sincronizar las versiones PWA.

## Acceptance criteria

- Un cliente que recibe un controlador nuevo recibe un aviso con una acción «Recargar».
- La recarga solo sucede tras una elección explícita.
- Una instalación sin controlador previo no recibe un aviso falso.
- La actualización no accede ni escribe el estado, catálogo personal o credencial TMDB.
- Los checks de calidad, SDD y UI publicada pasan.
