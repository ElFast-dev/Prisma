# Autorización particular de TMDB comunicada para Prisma

**Estado:** referencia documental aportada por el propietario del proyecto.  
**Fecha de recepción en esta documentación:** 5 de noviembre de 2026.  
**Fecha original de la comunicación:** no indicada en el texto recibido.

> Este documento registra el contenido de una comunicación que el propietario ha compartido como respuesta oficial del equipo de TMDB a una consulta sobre Prisma. El equipo de desarrollo de Prisma no ha verificado de forma independiente la identidad del remitente ni el contexto de la cuenta. Conservar el correo original del remitente es recomendable como evidencia primaria.

## Alcance informado

Según la respuesta proporcionada por el propietario, TMDB confirmó una autorización particular para Prisma con los siguientes términos:

1. **Uso de metadatos:** uso autorizado sin restricciones para Prisma.
2. **Aprendizaje y validación:** se permite ampliar el aprendizaje y la validación basados en metadatos de TMDB.
3. **Caché:** se autoriza almacenamiento en caché ilimitado de metadatos e imágenes.
4. **Atribución de TMDB:** la respuesta indica que no se exige logo ni aviso de atribución para Prisma, y que esta excepción particular prevalece sobre la FAQ pública general.
5. **Distribución:** se autoriza distribuir públicamente Prisma y ofrecer descargas gratuitas de la app desde el repositorio público, sin monetización.
6. **Imágenes:** autorización expresa para portadas/carteles, fondos, fotografías de actores y profesionales, logotipos y caché ilimitada de dichas imágenes.
7. **Disponibilidad del servicio:** se reconoce que no hay SLA formal y que los límites de consultas pueden cambiar; la autorización se mantiene y Prisma debe funcionar correctamente cuando TMDB esté temporalmente fuera de servicio.
8. **Datos de disponibilidad de streaming de JustWatch:** la ampliación comunicada autoriza expresamente el uso de datos de disponibilidad procedentes de JustWatch a través de TMDB, sin obligación de atribución adicional a JustWatch ni a otra fuente.

## Consecuencias para el producto

- TMDB será la fuente externa principal de metadatos e imágenes.
- Se podrán almacenar localmente los metadatos e imágenes consultados para uso offline.
- Se podrá utilizar la información de proveedores de streaming que TMDB entregue a través de sus endpoints.
- «Dónde verla» podrá agrupar los proveedores por país y ofrecer un enlace externo cuando la API lo proporcione.
- La aplicación debe tolerar indisponibilidad, cambios de límites y respuestas incompletas.
- Prisma se distribuirá gratis y sin monetización mientras este sea el alcance comunicado.
- La clave de API personal no se publica en GitHub ni se incorpora al APK; cada instalación utiliza la clave que introduzca su usuario.

## Precisión importante

La autorización comunicada es específica para Prisma y está basada en el texto que el propietario compartió. No debe generalizarse a otros proyectos ni interpretarse como un SLA, como garantía de disponibilidad de datos en todos los países o como promesa de que cualquier película tendrá proveedores/tráileres registrados.

La caché legalmente permitida no elimina el límite físico del almacenamiento del teléfono. La app debe gestionar la capacidad del dispositivo sin sacrificar los datos personales.

Si en el futuro se planea monetización, cambio de titularidad, cambio sustancial de distribución o uso distinto al descrito, el propietario deberá volver a confirmar el alcance de la autorización antes de actuar.

## Fuentes públicas para implementación

- Autenticación de aplicaciones: https://developer.themoviedb.org/docs/authentication-application
- Búsqueda de películas: https://developer.themoviedb.org/docs/finding-data
- Construcción de URL de imágenes: https://developer.themoviedb.org/docs/image-basics
- Documentación de API: https://developer.themoviedb.org/reference/intro/getting-started

La documentación pública orienta la implementación técnica; el alcance especial descrito arriba procede de la comunicación particular aportada por el propietario.
