import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const requiredFiles = [
  'docs/product.md',
  'docs/architecture.md',
  'docs/data-model.md',
  'docs/decisions/0001-sdd-workflow.md',
  'openspec/project.md',
  'openspec/specs/catalog/spec.md',
  'openspec/specs/collection/spec.md',
  'openspec/specs/import-export/spec.md',
  'openspec/specs/recommendations/spec.md',
  'openspec/specs/release-process/spec.md',
  'openspec/changes/archive/2026-10-21-modal-actions-release-gate/proposal.md',
  'openspec/changes/archive/2026-10-21-modal-actions-release-gate/design.md',
  'openspec/changes/archive/2026-10-21-modal-actions-release-gate/tasks.md',
  'openspec/changes/archive/2026-10-21-modal-actions-release-gate/specs/interface/spec.md',
  'openspec/changes/archive/2026-10-21-modal-actions-release-gate/specs/release-process/spec.md',
  'scripts/test-modal-event-handlers.mjs',
  'scripts/test-modal-controller.mjs',
  'scripts/test-release-gating.mjs',
  'openspec/changes/archive/2026-10-21-temporal-date-provenance/proposal.md',
  'openspec/changes/archive/2026-10-21-temporal-date-provenance/design.md',
  'openspec/changes/archive/2026-10-21-temporal-date-provenance/tasks.md',
  'openspec/changes/archive/2026-10-21-temporal-date-provenance/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-21-temporal-date-provenance/specs/interface/spec.md',
  'scripts/test-watched-date-import.mjs',
  'openspec/changes/archive/2026-10-21-temporal-ridge-validation/proposal.md',
  'openspec/changes/archive/2026-10-21-temporal-ridge-validation/design.md',
  'openspec/changes/archive/2026-10-21-temporal-ridge-validation/tasks.md',
  'openspec/changes/archive/2026-10-21-temporal-ridge-validation/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-21-temporal-ridge-validation/specs/interface/spec.md',
  'openspec/changes/archive/2026-10-21-ridge-repeat-consistency-summary/proposal.md',
  'openspec/changes/archive/2026-10-21-ridge-repeat-consistency-summary/design.md',
  'openspec/changes/archive/2026-10-21-ridge-repeat-consistency-summary/tasks.md',
  'openspec/changes/archive/2026-10-21-ridge-repeat-consistency-summary/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-21-ridge-repeat-consistency-summary/specs/interface/spec.md',
  'openspec/changes/archive/2026-10-21-evaluate-ridge-recommendation-model/proposal.md',
  'openspec/changes/archive/2026-10-21-evaluate-ridge-recommendation-model/design.md',
  'openspec/changes/archive/2026-10-21-evaluate-ridge-recommendation-model/tasks.md',
  'openspec/changes/archive/2026-10-21-evaluate-ridge-recommendation-model/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-21-evaluate-ridge-recommendation-model/specs/interface/spec.md',
  'openspec/changes/archive/2026-10-21-compare-ridge-ranking-quality/proposal.md',
  'openspec/changes/archive/2026-10-21-compare-ridge-ranking-quality/design.md',
  'openspec/changes/archive/2026-10-21-compare-ridge-ranking-quality/tasks.md',
  'openspec/changes/archive/2026-10-21-compare-ridge-ranking-quality/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-21-ridge-fold-stability/proposal.md',
  'openspec/changes/archive/2026-10-21-ridge-fold-stability/design.md',
  'openspec/changes/archive/2026-10-21-ridge-fold-stability/tasks.md',
  'openspec/changes/archive/2026-10-21-repeated-ridge-validation/proposal.md',
  'openspec/changes/archive/2026-10-21-repeated-ridge-validation/design.md',
  'openspec/changes/archive/2026-10-21-repeated-ridge-validation/tasks.md',
  'openspec/changes/archive/2026-10-21-repeated-ridge-validation/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-21-repeated-ridge-validation/specs/interface/spec.md',
  'openspec/changes/archive/2026-10-21-ridge-fold-stability/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-21-evaluate-theme-support-shrinkage/proposal.md',
  'openspec/changes/archive/2026-10-21-evaluate-theme-support-shrinkage/design.md',
  'openspec/changes/archive/2026-10-21-evaluate-theme-support-shrinkage/tasks.md',
  'openspec/changes/archive/2026-10-21-evaluate-theme-support-shrinkage/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-21-evaluate-theme-support-shrinkage/specs/interface/spec.md',
  'openspec/changes/archive/2026-10-21-recommend-tmdb-candidates/proposal.md',
  'openspec/changes/archive/2026-10-21-recommend-tmdb-candidates/design.md',
  'openspec/changes/archive/2026-10-21-recommend-tmdb-candidates/tasks.md',
  'openspec/changes/archive/2026-10-21-recommend-tmdb-candidates/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-21-recommend-tmdb-candidates/specs/catalog/spec.md',
  'scripts/test-tmdb-recommendation-candidates.mjs',
  'openspec/changes/archive/2026-10-21-shareable-recommendation-diagnostics/proposal.md',
  'openspec/changes/archive/2026-10-21-shareable-recommendation-diagnostics/design.md',
  'openspec/changes/archive/2026-10-21-shareable-recommendation-diagnostics/tasks.md',
  'openspec/changes/archive/2026-10-21-shareable-recommendation-diagnostics/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-21-show-ranking-mode-delta/proposal.md',
  'openspec/changes/archive/2026-10-21-show-ranking-mode-delta/design.md',
  'openspec/changes/archive/2026-10-21-show-ranking-mode-delta/tasks.md',
  'openspec/changes/archive/2026-10-21-show-ranking-mode-delta/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-21-compare-recommendation-mode-ranking/proposal.md',
  'openspec/changes/archive/2026-10-21-compare-recommendation-mode-ranking/design.md',
  'openspec/changes/archive/2026-10-21-compare-recommendation-mode-ranking/tasks.md',
  'openspec/changes/archive/2026-10-21-compare-recommendation-mode-ranking/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-21-fix-subpixel-touch-target-assertion/proposal.md',
  'openspec/changes/archive/2026-10-21-fix-subpixel-touch-target-assertion/design.md',
  'openspec/changes/archive/2026-10-21-fix-subpixel-touch-target-assertion/tasks.md',
  'openspec/changes/archive/2026-10-21-fix-subpixel-touch-target-assertion/specs/interface/spec.md',

  'openspec/changes/archive/2026-10-21-evaluate-ranking-quality-and-diversity/proposal.md',
  'openspec/changes/archive/2026-10-21-evaluate-ranking-quality-and-diversity/design.md',
  'openspec/changes/archive/2026-10-21-evaluate-ranking-quality-and-diversity/tasks.md',
  'openspec/changes/archive/2026-10-21-evaluate-ranking-quality-and-diversity/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-21-add-release-decade-signal/proposal.md',
  'openspec/changes/archive/2026-10-21-add-release-decade-signal/design.md',
  'openspec/changes/archive/2026-10-21-add-release-decade-signal/tasks.md',
  'openspec/changes/archive/2026-10-21-add-release-decade-signal/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-21-personalize-discover-recommendations/proposal.md',
  'openspec/changes/archive/2026-10-21-personalize-discover-recommendations/design.md',
  'openspec/changes/archive/2026-10-21-personalize-discover-recommendations/tasks.md',
  'openspec/changes/archive/2026-10-21-personalize-discover-recommendations/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-21-personalize-discover-recommendations/specs/interface/spec.md',
  'openspec/changes/archive/2026-10-20-empty-first-run-tmdb-catalog/proposal.md',
  'openspec/changes/archive/2026-10-20-empty-first-run-tmdb-catalog/design.md',
  'openspec/changes/archive/2026-10-20-empty-first-run-tmdb-catalog/tasks.md',
  'openspec/changes/archive/2026-10-20-empty-first-run-tmdb-catalog/specs/catalog/spec.md',
  'openspec/changes/archive/2026-10-20-empty-first-run-tmdb-catalog/specs/interface/spec.md',
  'openspec/specs/privacy-storage/spec.md',
  'openspec/changes/archive/2026-10-21-request-persistent-storage/proposal.md',
  'openspec/changes/archive/2026-10-21-request-persistent-storage/design.md',
  'openspec/changes/archive/2026-10-21-request-persistent-storage/tasks.md',
  'openspec/changes/archive/2026-10-21-request-persistent-storage/specs/privacy-storage/spec.md',
  'openspec/specs/tmdb/spec.md',
  'openspec/changes/archive/2026-10-21-fix-tmdb-connection-check/proposal.md',
  'openspec/changes/archive/2026-10-21-fix-tmdb-connection-check/design.md',
  'openspec/changes/archive/2026-10-21-fix-tmdb-connection-check/tasks.md',
  'openspec/changes/archive/2026-10-21-fix-tmdb-connection-check/specs/tmdb/spec.md',
  'openspec/specs/pwa-deployment/spec.md',
  'openspec/changes/archive/2026-10-21-harden-pwa-update-activation/proposal.md',
  'openspec/changes/archive/2026-10-21-harden-pwa-update-activation/design.md',
  'openspec/changes/archive/2026-10-21-harden-pwa-update-activation/tasks.md',
  'openspec/changes/archive/2026-10-21-harden-pwa-update-activation/specs/pwa-deployment/spec.md',
  'openspec/specs/interface/spec.md',
  'openspec/changes/archive/2026-10-21-refine-mobile-navigation/proposal.md',
  'openspec/changes/archive/2026-10-21-refine-mobile-navigation/design.md',
  'openspec/changes/archive/2026-10-21-refine-mobile-navigation/tasks.md',
  'openspec/changes/archive/2026-10-21-refine-mobile-navigation/specs/interface/spec.md',
  'openspec/changes/archive/2026-10-21-polish-movie-detail-experience/proposal.md',
  'openspec/changes/archive/2026-10-21-polish-movie-detail-experience/design.md',
  'openspec/changes/archive/2026-10-21-polish-movie-detail-experience/tasks.md',
  'openspec/changes/archive/2026-10-21-polish-movie-detail-experience/specs/interface/spec.md',
  'openspec/specs/architecture-modularity/spec.md',
  'openspec/specs/style-modularity/spec.md',
  'js/core/movie-utils.js',
  'js/core/storage.js',
  'js/core/storage-protection.js',
  'js/diagnostics/recommendation-report.js',
  'js/core/state-model.js',
  'js/recommendations/features.js',
  'js/recommendations/engine.js',
  'js/recommendations/ridge-evaluation.js',
  'js/recommendations/evaluation.js',
  'scripts/test-recommendation-evaluation.mjs',
  'js/recommendations/preferences.js',
  'js/catalog/csv-parser.js',
  'js/catalog/catalog-model.js',
  'js/collection/collection-model.js',
  'js/ui/presentation-utils.js',
  'js/ui/page-views.js',
  'js/ui/theme-controller.js',
  'js/ui/modal-views.js',
  'js/app/movie-actions.js',
  'js/import-export/personal-data.js',
  'js/import-export/actions.js',
  'js/app/event-handlers.js',
  'js/tmdb/settings-actions.js',
  'js/ui/tmdb-views.js',
  'js/tmdb/history-sync.js',
  'js/tmdb/browser-actions.js',
  'js/app/lifecycle.js',
  'js/app/pwa-update.js',
  'js/app/runtime.js',
  'js/recommendations/ranking.js',
  'js/ui/modal-controller.js',
  'js/tmdb/movie-details.js',
  'js/tmdb/client.js',
  'scripts/test-modular-architecture.mjs',
  'scripts/test-collection-views.mjs',
  'scripts/test-tmdb-client.mjs',
  'scripts/test-storage-protection.mjs',
  'scripts/test-recommendation-diagnostic-report.mjs',
  'scripts/test-tmdb-settings-actions.mjs',
  'scripts/test-style-modularity.mjs',
  'scripts/test-design-system.mjs',
  'scripts/test-brand-assets.mjs',
  'scripts/test-theme-controller.mjs',
  'openspec/changes/archive/2026-10-20-sync-brand-mark-palette/proposal.md',
  'openspec/changes/archive/2026-10-20-sync-brand-mark-palette/design.md',
  'openspec/changes/archive/2026-10-20-sync-brand-mark-palette/tasks.md',
  'openspec/changes/archive/2026-10-20-sync-brand-mark-palette/specs/pwa-deployment/spec.md',
  'openspec/changes/archive/2026-10-20-add-light-and-refined-dark-theme/proposal.md',
  'openspec/changes/archive/2026-10-20-add-light-and-refined-dark-theme/design.md',
  'openspec/changes/archive/2026-10-20-add-light-and-refined-dark-theme/tasks.md',
  'openspec/changes/archive/2026-10-20-add-light-and-refined-dark-theme/specs/interface/spec.md',
  'openspec/changes/archive/2026-10-20-cinematic-design-system/proposal.md',
  'openspec/changes/archive/2026-10-20-cinematic-design-system/design.md',
  'openspec/changes/archive/2026-10-20-cinematic-design-system/tasks.md',
  'openspec/changes/archive/2026-10-20-cinematic-design-system/specs/interface/spec.md',
  'openspec/changes/archive/2026-10-20-adopt-sdd-workflow/proposal.md',
  'openspec/changes/archive/2026-10-20-adopt-sdd-workflow/design.md',
  'openspec/changes/archive/2026-10-20-adopt-sdd-workflow/tasks.md',
  'openspec/changes/archive/2026-10-20-adopt-sdd-workflow/specs/development-workflow/spec.md',
  'openspec/changes/archive/2026-10-20-fix-tmdb-csv-identity/proposal.md',
  'openspec/changes/archive/2026-10-20-fix-tmdb-csv-identity/design.md',
  'openspec/changes/archive/2026-10-20-fix-tmdb-csv-identity/tasks.md',
  'openspec/changes/archive/2026-10-20-fix-tmdb-csv-identity/specs/catalog/spec.md',
  'scripts/test-catalog-import.mjs',
  'scripts/test-empty-first-run.mjs',
  'scripts/test-pwa-update.mjs',
  'scripts/test-movie-rating-sources.mjs',
  'scripts/test-discovery-detail-polish.mjs',
  'scripts/test-mobile-navigation.mjs',
  'scripts/test-model-evaluation.mjs',
  'scripts/test-ridge-evaluation.mjs',
  'scripts/test-watch-date-provenance.mjs',
  'scripts/test-cache-versioning.mjs',
  'scripts/test-recommendation-features.mjs',
  'scripts/test-recommendation-signal-weighting.mjs',
  'scripts/test-recommendation-modes.mjs',
  'openspec/changes/archive/2026-10-20-modularize-application-core/proposal.md',
  'openspec/changes/archive/2026-10-20-modularize-application-core/design.md',
  'openspec/changes/archive/2026-10-20-modularize-application-core/tasks.md',
  'openspec/changes/archive/2026-10-20-modularize-application-core/specs/architecture-modularity/spec.md',
  'openspec/changes/archive/2026-10-20-calibrate-recommendation-signals/proposal.md',
  'openspec/changes/archive/2026-10-20-calibrate-recommendation-signals/design.md',
  'openspec/changes/archive/2026-10-20-calibrate-recommendation-signals/tasks.md',
  'openspec/changes/archive/2026-10-20-calibrate-recommendation-signals/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-20-version-pwa-assets/proposal.md',
  'openspec/changes/archive/2026-10-20-version-pwa-assets/design.md',
  'openspec/changes/archive/2026-10-20-version-pwa-assets/tasks.md',
  'openspec/changes/archive/2026-10-20-version-pwa-assets/specs/pwa-deployment/spec.md',
  'openspec/changes/archive/2026-10-20-improve-model-validation/proposal.md',
  'openspec/changes/archive/2026-10-20-improve-model-validation/design.md',
  'openspec/changes/archive/2026-10-20-improve-model-validation/tasks.md',
  'openspec/changes/archive/2026-10-20-improve-model-validation/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-20-fix-discovery-and-movie-detail/proposal.md',
  'openspec/changes/archive/2026-10-20-fix-discovery-and-movie-detail/design.md',
  'openspec/changes/archive/2026-10-20-fix-discovery-and-movie-detail/tasks.md',
  'openspec/changes/archive/2026-10-20-fix-discovery-and-movie-detail/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-20-fix-discovery-and-movie-detail/specs/interface/spec.md',
  'openspec/changes/archive/2026-10-20-clarify-movie-rating-sources/proposal.md',
  'openspec/changes/archive/2026-10-20-clarify-movie-rating-sources/design.md',
  'openspec/changes/archive/2026-10-20-clarify-movie-rating-sources/tasks.md',
  'openspec/changes/archive/2026-10-20-clarify-movie-rating-sources/specs/interface/spec.md',
  'openspec/changes/archive/2026-10-20-clarify-movie-rating-sources/specs/tmdb/spec.md',
  'openspec/changes/archive/2026-10-20-refine-catalog-collection-layout/proposal.md',
  'openspec/changes/archive/2026-10-20-refine-catalog-collection-layout/design.md',
  'openspec/changes/archive/2026-10-20-refine-catalog-collection-layout/tasks.md',
  'openspec/changes/archive/2026-10-20-refine-catalog-collection-layout/specs/interface/spec.md',
  'openspec/changes/archive/2026-10-20-add-progress-onboarding/proposal.md',
  'openspec/changes/archive/2026-10-20-add-progress-onboarding/design.md',
  'openspec/changes/archive/2026-10-20-add-progress-onboarding/tasks.md',
  'openspec/changes/archive/2026-10-20-add-progress-onboarding/specs/interface/spec.md',
  'openspec/changes/archive/2026-10-20-fix-hidden-catalog-identity/proposal.md',
  'openspec/changes/archive/2026-10-20-fix-hidden-catalog-identity/design.md',
  'openspec/changes/archive/2026-10-20-fix-hidden-catalog-identity/tasks.md',
  'openspec/changes/archive/2026-10-20-fix-hidden-catalog-identity/specs/catalog/spec.md',
  'openspec/changes/archive/2026-10-20-refine-ui-interactions/proposal.md',
  'openspec/changes/archive/2026-10-20-refine-ui-interactions/design.md',
  'openspec/changes/archive/2026-10-20-refine-ui-interactions/tasks.md',
  'openspec/changes/archive/2026-10-20-refine-ui-interactions/specs/interface/spec.md',
  'openspec/changes/archive/2026-10-21-hybrid-ridge-diagnostics/proposal.md',
  'openspec/changes/archive/2026-10-21-hybrid-ridge-diagnostics/design.md',
  'openspec/changes/archive/2026-10-21-hybrid-ridge-diagnostics/tasks.md',
  'openspec/changes/archive/2026-10-21-hybrid-ridge-diagnostics/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-21-canonical-genre-feature-keys/proposal.md',
  'openspec/changes/archive/2026-10-21-canonical-genre-feature-keys/design.md',
  'openspec/changes/archive/2026-10-21-canonical-genre-feature-keys/tasks.md',
  'openspec/changes/archive/2026-10-21-canonical-genre-feature-keys/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-21-canonical-genre-feature-keys/specs/catalog/spec.md',
  'openspec/changes/archive/2026-10-21-calibrate-feature-influence-normalization/proposal.md',
  'openspec/changes/archive/2026-10-21-calibrate-feature-influence-normalization/design.md',
  'openspec/changes/archive/2026-10-21-calibrate-feature-influence-normalization/tasks.md',
  'openspec/changes/archive/2026-10-21-calibrate-feature-influence-normalization/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-21-temporal-added-date-proxy/proposal.md',
  'openspec/changes/archive/2026-10-21-temporal-added-date-proxy/design.md',
  'openspec/changes/archive/2026-10-21-temporal-added-date-proxy/tasks.md',
  'openspec/changes/archive/2026-10-21-temporal-added-date-proxy/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-21-clarify-temporal-proxy-labels/proposal.md',
  'openspec/changes/archive/2026-10-21-clarify-temporal-proxy-labels/design.md',
  'openspec/changes/archive/2026-10-21-clarify-temporal-proxy-labels/tasks.md',
  'openspec/changes/archive/2026-10-21-clarify-temporal-proxy-labels/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-22-year-aware-recommendation-lookups/proposal.md',
  'openspec/changes/archive/2026-10-22-year-aware-recommendation-lookups/design.md',
  'openspec/changes/archive/2026-10-22-year-aware-recommendation-lookups/tasks.md',
  'openspec/changes/archive/2026-10-22-year-aware-recommendation-lookups/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-22-scalable-watch-history-and-compact-progress-calendar/proposal.md',
  'openspec/changes/archive/2026-10-22-scalable-watch-history-and-compact-progress-calendar/design.md',
  'openspec/changes/archive/2026-10-22-scalable-watch-history-and-compact-progress-calendar/tasks.md',
  'openspec/changes/archive/2026-10-22-scalable-watch-history-and-compact-progress-calendar/specs/import-export/spec.md',
  'openspec/changes/archive/2026-10-22-scalable-watch-history-and-compact-progress-calendar/specs/interface/spec.md',
  'openspec/changes/archive/2026-10-22-scalable-watch-history-and-compact-progress-calendar/specs/recommendations/spec.md',
  'openspec/changes/archive/2026-10-23-extract-watch-streak-view/proposal.md',
  'openspec/changes/archive/2026-10-23-extract-watch-streak-view/design.md',
  'openspec/changes/archive/2026-10-23-extract-watch-streak-view/tasks.md',
  'openspec/changes/archive/2026-10-23-extract-watch-streak-view/specs/interface/spec.md',
  'openspec/changes/archive/2026-10-23-prevent-stale-pages-deploy/proposal.md',
  'openspec/changes/archive/2026-10-23-prevent-stale-pages-deploy/design.md',
  'openspec/changes/archive/2026-10-23-prevent-stale-pages-deploy/tasks.md',
  'openspec/changes/archive/2026-10-23-prevent-stale-pages-deploy/specs/release-process/spec.md',
  'openspec/changes/archive/2026-10-23-extract-lab-views/proposal.md',
  'openspec/changes/archive/2026-10-23-extract-lab-views/design.md',
  'openspec/changes/archive/2026-10-23-extract-lab-views/tasks.md',
  'openspec/changes/archive/2026-10-23-extract-lab-views/specs/interface/spec.md',
  'openspec/changes/2026-10-23-extract-collection-views/proposal.md',
  'openspec/changes/2026-10-23-extract-collection-views/design.md',
  'openspec/changes/2026-10-23-extract-collection-views/tasks.md',
  'openspec/changes/2026-10-23-extract-collection-views/specs/interface/spec.md',
  'openspec/changes/2026-10-23-extract-progress-view/proposal.md',
  'openspec/changes/2026-10-23-extract-progress-view/design.md',
  'openspec/changes/2026-10-23-extract-progress-view/tasks.md',
  'openspec/changes/2026-10-23-extract-progress-view/specs/interface/spec.md',
  'openspec/changes/2026-10-23-extract-catalog-views/proposal.md',
  'openspec/changes/2026-10-23-extract-catalog-views/design.md',
  'openspec/changes/2026-10-23-extract-catalog-views/tasks.md',
  'openspec/changes/2026-10-23-extract-catalog-views/specs/interface/spec.md',
  'openspec/changes/2026-10-23-extract-settings-views/proposal.md',
  'openspec/changes/2026-10-23-extract-settings-views/design.md',
  'openspec/changes/2026-10-23-extract-settings-views/tasks.md',
  'openspec/changes/2026-10-23-extract-settings-views/specs/interface/spec.md',
  'openspec/changes/2026-10-23-split-lab-panel-views/proposal.md',
  'openspec/changes/2026-10-23-split-lab-panel-views/design.md',
  'openspec/changes/2026-10-23-split-lab-panel-views/tasks.md',
  'openspec/changes/2026-10-23-split-lab-panel-views/specs/interface/spec.md'
];

const errors = [];

for (const file of requiredFiles) {
  try {
    await access(file);
    const content = await readFile(file, 'utf8');
    if (!content.trim()) errors.push(file + ': el archivo está vacío');
  } catch {
    errors.push(file + ': falta el archivo requerido');
  }
}

async function walk(directory) {
  const found = [];
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return found;
  }

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await walk(path));
    else if (entry.isFile() && entry.name.toLowerCase() === 'spec.md') found.push(path);
  }

  return found;
}

const specFiles = await walk('openspec');

if (specFiles.length === 0) {
  errors.push('openspec: no se encontró ningún archivo spec.md');
}

for (const file of specFiles) {
  const content = await readFile(file, 'utf8');
  if (!/^## (?:Requirements|ADDED Requirements|MODIFIED Requirements|REMOVED Requirements)\s*$/m.test(content)) {
    errors.push(file + ': falta el encabezado "## Requirements"');
  }

  const headings = [...content.matchAll(/^### Requirement:\s*(.+)$/gm)];
  if (headings.length === 0) {
    errors.push(file + ': debe contener al menos un encabezado "### Requirement:"');
    continue;
  }

  for (let index = 0; index < headings.length; index += 1) {
    const start = headings[index].index;
    const end = index + 1 < headings.length ? headings[index + 1].index : content.length;
    const block = content.slice(start, end);
    const label = headings[index][1].trim();

    if (!/^#### Scenario:\s*.+/m.test(block)) {
      errors.push(file + ': el requisito "' + label + '" no contiene un escenario');
    }

    if (!/\b(?:MUST|SHALL|DEBEN|DEBE|DEBERÁN|DEBERÁ|DEBERAN|NO DEBEN|NO DEBE)\b/i.test(block)) {
      errors.push(file + ': el requisito "' + label + '" necesita una declaración normativa (DEBE/MUST/SHALL)');
    }
  }
}

for (const file of [
  'openspec/changes/archive/2026-10-20-adopt-sdd-workflow/proposal.md',
  'openspec/changes/archive/2026-10-20-adopt-sdd-workflow/design.md',
  'openspec/changes/archive/2026-10-20-adopt-sdd-workflow/tasks.md'
]) {
  try {
    const content = await readFile(file, 'utf8');
    if (!/^## /m.test(content)) errors.push(file + ': falta estructura de encabezados');
  } catch {
    // El error de archivo requerido ya se registró arriba.
  }
}

if (errors.length > 0) {
  console.error('Validación SDD fallida:');
  for (const error of errors) console.error(' - ' + error);
  process.exitCode = 1;
} else {
  console.log('Validación SDD correcta: ' + requiredFiles.length + ' artefactos requeridos y ' + specFiles.length + ' especificaciones con requisitos y escenarios.');
}
