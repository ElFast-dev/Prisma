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
  'openspec/specs/privacy-storage/spec.md',
  'openspec/specs/tmdb/spec.md',
  'openspec/specs/pwa-deployment/spec.md',
  'openspec/specs/interface/spec.md',
  'openspec/changes/archive/2026-10-20-adopt-sdd-workflow/proposal.md',
  'openspec/changes/archive/2026-10-20-adopt-sdd-workflow/design.md',
  'openspec/changes/archive/2026-10-20-adopt-sdd-workflow/tasks.md',
  'openspec/changes/archive/2026-10-20-adopt-sdd-workflow/specs/development-workflow/spec.md',
  'openspec/changes/archive/2026-10-20-fix-tmdb-csv-identity/proposal.md',
  'openspec/changes/archive/2026-10-20-fix-tmdb-csv-identity/design.md',
  'openspec/changes/archive/2026-10-20-fix-tmdb-csv-identity/tasks.md',
  'openspec/changes/archive/2026-10-20-fix-tmdb-csv-identity/specs/catalog/spec.md',
  'scripts/test-catalog-import.mjs',
  'scripts/test-movie-rating-sources.mjs',
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
  'openspec/changes/archive/2026-10-20-refine-ui-interactions/specs/interface/spec.md'
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
