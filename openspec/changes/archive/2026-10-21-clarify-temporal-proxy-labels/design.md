# Diseño: etiquetas temporales sensibles al modo de fecha

El renderizador determina el modo desde el resultado agregado, con un respaldo al selector local si todavía no hay resultado. Cuando el modo es collection-added-proxy, el subtítulo, los recuentos de prueba, los títulos nDCG y los nombres de ventanas describen la ordenación por incorporación y se marcan como exploratorios. En modo watchedAt-only se mantienen las etiquetas de walk-forward de visionados posteriores.

El experimento, las particiones, las métricas y el formato del resultado permanecen iguales. El cambio es exclusivamente de presentación y no crea ni modifica watchedAt.
