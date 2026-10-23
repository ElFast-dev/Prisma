import { createUtilitySheetView } from "./utility-sheet-view.js?v=ui-20261023-1";
import { createMovieDetailView } from "./movie-detail-view.js?v=ui-20261023-1";
import { createPersonDetailView } from "./person-detail-view.js?v=ui-20261023-1";
import { createRatingSheetView } from "./rating-sheet-view.js?v=ui-20261023-1";

export function createModalViews(ctx) {
  return {
    ...createUtilitySheetView(ctx),
    ...createMovieDetailView(ctx),
    ...createPersonDetailView(ctx),
    ...createRatingSheetView(ctx)
  };
}
