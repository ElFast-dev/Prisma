import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const [quality, browser, deploy] = await Promise.all([
  readFile(".github/workflows/quality.yml", "utf8"),
  readFile(".github/workflows/ui-screenshots.yml", "utf8"),
  readFile(".github/workflows/deploy-pages.yml", "utf8")
]);

async function exists(path) {
  return access(path).then(() => true, () => false);
}

assert.match(quality, /pull_request:[\s\S]*?branches:\s*\[main\]/,
  "La calidad completa debe ejecutarse en cada PR hacia main.");
assert.match(quality, /push:[\s\S]*?branches:\s*\[main\]/,
  "Los cambios en main deben pasar la batería completa antes de abrir la compuerta.");
assert.match(quality, /node scripts\/validate-sdd\.mjs/,
  "La compuerta debe validar SDD.");
assert.match(quality, /node scripts\/test-modal-event-handlers\.mjs/,
  "La batería debe probar los clics del modal con su contexto real.");
assert.match(quality, /node scripts\/test-release-gating\.mjs/,
  "La batería debe validar la propia compuerta de publicación.");
assert.match(quality, /JSON\.parse\(require\('fs'\)\.readFileSync\('manifest\.webmanifest'/,
  "El workflow canónico debe validar el manifest PWA.");

assert.match(browser, /workflows:\s*\["SDD and static quality"\]/,
  "Playwright de main debe esperar a SDD y la batería completa.");
assert.match(browser, /github\.event\.workflow_run\.conclusion\s*==\s*'success'/,
  "Playwright debe saltarse una versión cuya calidad haya fallado.");
assert.match(browser, /github\.event\.workflow_run\.head_sha/,
  "Playwright debe descargar el SHA exacto que pasó calidad.");
assert.match(browser, /github\.event_name == 'pull_request' \|\| github\.event_name == 'workflow_run'/,
  "Los PR y el chequeo previo de main deben servirse localmente.");
assert.ok(browser.includes("github.event_name != 'workflow_dispatch' && 'http://127.0.0.1:8765/'"),
  "La ejecución de workflow_run debe probar el código local y no la web ya publicada.");

assert.match(deploy, /workflows:\s*\["Prisma UI screenshots"\]/,
  "El despliegue debe depender del workflow de navegador.");
assert.match(deploy, /github\.event\.workflow_run\.conclusion\s*==\s*'success'/,
  "Un Playwright fallido debe bloquear el despliegue.");
assert.match(deploy, /github\.event\.workflow_run\.event\s*==\s*'workflow_run'/,
  "Una ejecución manual aislada de capturas no debe disparar el deploy.");
assert.match(deploy, /concurrency:[\s\S]*?group:\s*github-pages[\s\S]*?cancel-in-progress:\s*false/,
  "Los eventos de capturas canceladas o fallidas no deben cancelar un deploy aprobado en curso.");
assert.match(browser, /TESTED_SOURCE_SHA:\s*\$\{\{ github\.event_name == 'workflow_run' && github\.event\.workflow_run\.head_sha/,
  "Playwright debe escribir el SHA del commit exacto que recibió de la validación.");
assert.match(browser, /name: prisma-published-ui-screenshots/,
  "Playwright debe emitir el artefacto que autoriza el despliegue.");
assert.match(browser, /tested-sha\.txt/,
  "El artefacto de Playwright debe llevar el SHA exacto validado.");
assert.match(browser, /if-no-files-found: error/,
  "El flujo de navegador no debe poder aprobar sin el artefacto con el SHA probado.");
assert.match(deploy, /actions\/download-artifact@v4/,
  "El despliegue debe descargar la aprobación generada por Playwright.");
assert.match(deploy, /name: prisma-published-ui-screenshots/,
  "El nombre del artefacto de deploy debe coincidir con el de Playwright.");
assert.match(deploy, /release-approval\/tested-sha\.txt/,
  "El SHA desplegable debe proceder del artefacto validado.");
assert.match(deploy, /ref:\s*\$\{\{ steps\.tested-source\.outputs\.sha \}\}/,
  "Pages debe desplegar el SHA aprobado, no un head SHA móvil de main.");
assert.doesNotMatch(deploy, /^\s{2}push:/m,
  "No se permite desplegar directamente con cualquier push a main.");
assert.doesNotMatch(deploy, /^\s{2}workflow_dispatch:/m,
  "No debe existir un bypass manual del despliegue.");

assert.equal(await exists(".github/workflows/validate.yml"), false,
  "El workflow validate.yml duplicado debe retirarse.");

console.log("Compuerta de publicación verificada: calidad → Playwright del mismo SHA → GitHub Pages, sin bypass directo ni workflow duplicado.");
