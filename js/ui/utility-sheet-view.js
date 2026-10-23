export function createUtilitySheetView(ctx) {
  function renderUtilitySheet() {
    const root = ctx.$("#modalRoot");
    if (!root || !ctx.utilitySheet) return;
    if (ctx.utilitySheet.type === "info") {
      const help = {
        progress:{title:"Progreso",body:"Resume las películas vistas, las notas y la media personal de este navegador. Las tendencias por género usan los metadatos enlazados disponibles."},
        discover:{title:"Descubrir",body:"Aquí tienes recomendaciones, búsqueda TMDB y catálogo local. Las recomendaciones no incluyen películas vistas, pendientes u ocultas."},
        recommendations:{title:"Recomendaciones",body:"Prisma compara géneros, palabras clave, trama y otros metadatos cinematográficos disponibles con tus valoraciones. La nota mostrada es una estimación personal, no una puntuación pública ni una garantía."},
        collection:{title:"Tu colección",body:"Historial reúne películas vistas o valoradas. Pendientes guarda títulos para más tarde. Ocultos los retira de recomendaciones sin borrar sus notas. La búsqueda y los filtros solo afectan a la colección."},
        genres:{title:"Géneros",body:"Puedes seleccionar varios. Se muestran películas que coinciden con al menos uno de los géneros escogidos."},
        metadata:{title:"Carátulas y datos",body:"El JSON aporta títulos, identificadores TMDB, fechas y valoraciones; no incluye imágenes ni sinopsis. Prisma usa los identificadores para recuperar carátulas, géneros, sinopsis, duración y otros datos. Los resultados se guardan en este navegador."},
        tmdb:{title:"TMDB",body:"TMDB proporciona imágenes y datos de películas. Si no hay dato externo verificable, Prisma ofrece un enlace en vez de inventar una puntuación."},
        import:{title:"Importar JSON",body:"Prisma importa movies.cH (vistas), movies.cW (pendientes) y movies.rM (valoraciones). Las series de shows se ignoran. Tus notas manuales existentes tienen prioridad."},
        privacy:{title:"Privacidad",body:"Notas, listas y credencial TMDB se guardan en este navegador. No publiques tu JSON en GitHub. Exporta una copia de seguridad antes de borrar los datos del navegador."},
        lab:{title:"Laboratorio",body:"Muestra patrones de tus valoraciones y comprueba el motor con el historial enlazado. Las medidas son experimentales."},
        ratings:{title:"Puntuaciones",body:"La puntuación pública aparece si la fuente la entrega. IMDb, Rotten Tomatoes y Metacritic se abren como enlaces si sus cifras no están disponibles directamente."}
      };
      const info = help[ctx.utilitySheet.key] || help.collection;
      root.innerHTML = '<div class="modal-backdrop" data-action="backdrop-close"><section class="modal utility-sheet info-sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" data-modal-panel><div class="sheet-handle"></div><div class="sheet-heading"><h2 id="sheetTitle">' + ctx.escapeHTML(info.title) + '</h2><button class="modal-close" type="button" data-action="close-sheet" aria-label="Cerrar">✕</button></div><p class="info-sheet-copy">' + ctx.escapeHTML(info.body) + '</p><button class="btn btn-primary sheet-accept" type="button" data-action="close-sheet">Entendido</button></section></div>';
      return;
    }
    if (ctx.utilitySheet.type === "sort") {
      const options = [
        {key:"title",label:"Título",hint:"Orden alfabético"},
        {key:"public",label:"Mejores valorados",hint:"Nota pública de TMDB"},
        {key:"rating",label:"Mi valoración",hint:"Tu nota del 1 al 10"},
        {key:"runtime",label:"Duración",hint:"Películas más largas o cortas"},
        {key:"release",label:"Más reciente",hint:"Fecha de estreno"},
        {key:"added",label:"Añadidos recientemente",hint:"Fecha en que guardaste la película"},
        {key:"random",label:"Aleatorio",hint:"Mezcla la lista"}
      ];
      root.innerHTML = '<div class="modal-backdrop" data-action="backdrop-close"><section class="modal utility-sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" data-modal-panel><div class="sheet-handle"></div><div class="sheet-heading"><div><div class="eyebrow">PERSONALIZA TU LISTA</div><h2 id="sheetTitle">Ordenar por</h2></div><button class="modal-close" type="button" data-action="close-sheet" aria-label="Cerrar">✕</button></div><button class="sort-direction" type="button" data-action="toggle-sort-direction"><span>Dirección del orden</span><strong>' + (ctx.utilitySheet.direction === "asc" ? "Ascendente ↑" : "Descendente ↓") + '</strong></button><div class="sheet-options">' + options.map(function (item) {
        const active = ctx.utilitySheet.sort === item.key;
        return '<button type="button" class="sheet-option ' + (active ? "active" : "") + '" data-action="choose-sort" data-sort="' + item.key + '"><span><strong>' + item.label + '</strong><small>' + item.hint + '</small></span><span class="sheet-option-mark">' + (active ? (ctx.utilitySheet.direction === "asc" ? "↑" : "↓") : "") + '</span></button>';
      }).join("") + '</div><button class="btn btn-primary sheet-accept" type="button" data-action="accept-sort">Aceptar</button></section></div>';
      return;
    }
    if (ctx.utilitySheet.type === "genres") {
      const genres = ctx.uniqueStrings(ctx.COLLECTION_GENRES.concat(ctx.allGenres())).sort(function (a, b) { return a.localeCompare(b, "es"); });
      root.innerHTML = '<div class="modal-backdrop" data-action="backdrop-close"><section class="modal utility-sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" data-modal-panel><div class="sheet-handle"></div><div class="sheet-heading"><div><div class="eyebrow">AFINA LA SELECCIÓN</div><h2 id="sheetTitle">Géneros</h2></div><button class="modal-close" type="button" data-action="close-sheet" aria-label="Cerrar">✕</button></div><p class="kicker">Puedes seleccionar varios géneros. Se mostrarán películas que coincidan con al menos uno.</p><div class="sheet-genre-grid">' + genres.map(function (genre) {
        const selected = ctx.utilitySheet.genres.some(function (value) { return ctx.titleKey(value) === ctx.titleKey(genre); });
        return '<button type="button" class="sheet-genre ' + (selected ? "selected" : "") + '" data-action="toggle-sheet-genre" data-genre="' + ctx.escapeHTML(genre) + '" aria-pressed="' + selected + '"><span>' + ctx.escapeHTML(genre) + '</span><b>' + (selected ? "✓" : "+") + '</b></button>';
      }).join("") + '</div><div class="sheet-footer-actions"><button class="btn btn-quiet" type="button" data-action="clear-sheet-genres">Limpiar</button><button class="btn btn-primary" type="button" data-action="accept-genres">Aceptar</button></div></section></div>';
      return;
    }
    const current = ctx.movieDetail ? ctx.movieDetail.movie : null;
    root.innerHTML = '<div class="modal-backdrop" data-action="backdrop-close"><section class="modal utility-sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" data-modal-panel><div class="sheet-handle"></div><div class="sheet-heading"><div><div class="eyebrow">TU COLECCIÓN</div><h2 id="sheetTitle">Gestionar listas</h2><p>' + ctx.escapeHTML(current ? current.title : "") + '</p></div><button class="modal-close" type="button" data-action="close-sheet" aria-label="Cerrar">✕</button></div><div class="manage-list-actions"><button class="manage-list-action" type="button" data-action="manage-history"><span>✓</span><strong>' + (current && ctx.isInHistory(current.title) ? "Ya está en tu historial" : "Añadir al historial") + '</strong><small>Marcar como vista sin necesidad de poner una nota.</small></button><button class="manage-list-action" type="button" data-action="manage-pending"><span>＋</span><strong>' + (current && ctx.isInWatchlist(current.title) ? "Quitar de pendientes" : "Añadir a pendientes") + '</strong><small>Guardar para verla más adelante.</small></button><button class="manage-list-action" type="button" data-action="manage-hidden"><span>◌</span><strong>' + (current && ctx.isHidden(current.title) ? "Mostrar en Prisma" : "Ocultar película") + '</strong><small>Controla si aparece en Descubrir y en tus listas visibles.</small></button></div></section></div>';
  }
  return { renderUtilitySheet };
}
