# Retirar el catálogo de muestra predeterminado

## Why

Prisma empieza con 54 películas empaquetadas en el repositorio, aunque la persona aún no haya añadido datos. Esos registros se mezclan con películas recuperadas de TMDB y pueden crear tarjetas incompletas o duplicadas, como dos entradas de «About Time». Esto contradice la experiencia personal y el principio de no inventar metadatos.

## Scope

- Eliminar el catálogo de muestra y su carga en el inicio.
- Mantener vacío el perfil y el catálogo local hasta que la persona importe o añada datos.
- Mantener la exploración de películas a través de resultados reales de TMDB, cuando la persona haya configurado la credencial.
- Mejorar el estado vacío de Descubrir y documentar la regla.
- Añadir pruebas de inicio limpio y una comprobación de navegador publicada.

## Acceptance criteria

- Un perfil recién creado no recibe títulos del repositorio ni muestra tarjetas locales inventadas.
- Sin estado personal ni catálogo importado, el catálogo combinado local contiene cero películas.
- Al abrir Descubrir, el inventario local indica cero títulos y no aparecen fichas de muestra; los resultados, si existen, provienen de TMDB.
- Eliminar el catálogo predeterminado no borra ni migra los datos personales que ya existan en el navegador.
- Las pruebas de calidad, la UI de Playwright y el despliegue siguen funcionando.
