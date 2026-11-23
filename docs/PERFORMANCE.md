# Presupuesto de rendimiento

## Línea base

Build de producción de Prisma en el commit `8ac2e602ff976c6a2d65c381b78f74db799f5fe6` (23 de noviembre de 2026), medido desde la salida de GitHub Actions:

| Recurso | Tamaño sin comprimir | Gzip |
|---|---:|---:|
| JavaScript inicial | 362.69 kB | 114.98 KiB |
| CSS inicial | 108.24 kB | 18.61 KiB |
| Pantalla Espectro (chunk diferido) | 78.86 kB | 23.67 KiB |
| Servicio de metadatos Espectro (chunk diferido) | 93.75 kB | 27.00 KiB |

Espectro y las pantallas principales se cargan bajo demanda; su código no se suma al recurso JavaScript inicial. El análisis principal de Espectro también se compila como Web Worker separado.

## Umbrales informativos

| Recurso | Presupuesto gzip |
|---|---:|
| JavaScript inicial | 150 KiB |
| CSS inicial | 25 KiB |
| Cada chunk diferido (mayor chunk reportado) | 45 KiB |

El script `scripts/check-bundle-budget.mjs` usa solo módulos nativos de Node y calcula gzip desde el build real. Si un umbral se supera, emite una anotación de advertencia en GitHub Actions; no falla el build ni crea un requisito obligatorio de protección de rama. Los límites dejan margen sobre la línea base actual y deberán revisarse cuando cambie el producto, no elevarse automáticamente para ocultar una regresión.

## Qué no mide

El tamaño de los archivos no predice por sí solo LCP, INP, CLS, consumo de batería, presión de memoria ni velocidad en un Android concreto. Este control no mide una red móvil real, la ejecución del Web Worker ni la experiencia táctil. Esas verificaciones requieren Lighthouse/Core Web Vitals sobre la publicación y pruebas en dispositivos físicos.

El presupuesto no recomienda dividir código en más chunks a cualquier precio: cada petición y cada importación diferida también tiene coste. La optimización debe basarse en mediciones comparables y preservar el funcionamiento offline.
