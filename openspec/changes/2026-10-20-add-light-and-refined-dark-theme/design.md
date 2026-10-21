# Diseño: tema negro y modo claro con azul apagado

## Decisión visual

No se añade una tercera capa CSS. `styles/prisma-design-system.css` sigue siendo la última capa de diseño y define ambos temas mediante variables; `data-theme="dark"` es el valor predeterminado. La paleta prescinde de brillos, viñetas violetas y gradientes decorativos en el fondo.

## Paleta de referencia

| Token | Oscuro | Claro |
| --- | --- | --- |
| Fondo principal | `#050505` | `#f4f5f7` |
| Fondo elevado | `#0c0d0f` | `#ffffff` |
| Superficie | `#121417` | `#ffffff` |
| Superficie elevada | `#191c20` | `#f8f9fb` |
| Superficie suave | `#24282d` | `#e9edf2` |
| Texto | `#f1f2f4` | `#181b20` |
| Texto secundario | `#a2a8b1` | `#525b66` |
| Azul secundario | `#8197b2` | `#486b94` |
| Azul de interacción | `#9aadc5` | `#365b86` |

Las notas, errores y confirmaciones se mantienen en tokens semánticos moderados y distinguibles.

## Isotipo y PWA

El isotipo conserva su geometría y adopta un degradado neutro de `#e2e8f0`, azul acero `#8197b2` y azul pizarra `#607d9e` sobre `#111417`. Favicon, cabecera y manifest comparten `./assets/prisma.svg?v=brand-20261020-2`. El manifest usa la versión `ui-20261020-15` y el shell sube a `prisma-shell-v50` para invalidar todas las referencias antiguas.

## Implementación modular

- `js/ui/theme-controller.js`: valida, lee, aplica y persiste la preferencia `dark|light`; no mezcla el tema con datos de películas.
- `js/ui/page-views.js`: presenta en Ajustes un selector de dos opciones con estado seleccionado accesible.
- `js/app/event-handlers.js`: enruta las acciones delegadas al controlador de tema y vuelve a renderizar el estado de selección.
- `styles/prisma-design-system.css`: tokens por `data-theme`, overrides para superficies y controles en tema claro y oscuro.
- `app.js`: compone el módulo e incrementa su URL versionada; `sw.js` incluye el módulo y renueva el shell.

## Persistencia y accesibilidad

Se utiliza una clave independiente `prisma:theme` en localStorage; no se guarda dentro del perfil de cine ni en copias de seguridad. Un valor ausente o inválido se interpreta como `dark`. El selector usa botones con `aria-pressed`, no depende de color únicamente y funciona por teclado.

## Validación

Pruebas estáticas verifican tokens y reglas de ambos temas, preferencia predeterminada/persistida, recursos PWA versionados y modularidad. Playwright cambia Oscuro/Claro en escritorio y móvil, confirma el atributo del documento y estilos calculados, recarga la página y comprueba que la elección persiste.
