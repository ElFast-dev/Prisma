# Delta: estilos modulares

## Requirements

### Requirement: Hojas de estilo separadas y orden estable

El sistema visual DEBE organizar las reglas CSS en hojas de estilo con responsabilidades reconocibles. El HTML DEBE cargar todas las hojas en un orden estable que conserve la cascada vigente y el service worker DEBE cachear las mismas URLs versionadas.

#### Scenario: Cambio en un módulo visual

- DADO que se modifica un estilo de tarjeta, modal, colección o responsive
- CUANDO se publica la aplicación
- ENTONCES el módulo correspondiente se carga en su posición declarada, tiene una URL versionada y está disponible desde la caché de shell.

### Requirement: Validación automática del mapa de estilos

CI DEBE verificar la existencia, el orden de carga, el versionado y la inclusión en la caché de cada hoja CSS.

#### Scenario: Falta una hoja en el documento o en la caché

- DADO que un archivo de estilos existe pero se omite de HTML o de APP_ASSETS
- CUANDO se ejecuta la validación de arquitectura
- ENTONCES CI falla e identifica la hoja de estilos omitida.


### Requirement: Sistema de marca y tokens visuales centralizados

Los tokens globales de color y las adaptaciones finales de marca DEBEN residir en `styles/brand-system.css`, cargada al final del orden de hojas CSS. La hoja DEBE tener una URL versionada y estar incluida con la misma URL en la caché de shell del service worker.

#### Scenario: Cambio de la identidad de Prisma

- DADO que se ajusta la paleta o un estado visual de uso general
- CUANDO se prepara la publicación
- ENTONCES el ajuste se realiza en la capa de marca, sin propagar nuevas definiciones globales duplicadas entre módulos de páginas
