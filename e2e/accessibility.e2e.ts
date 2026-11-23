import { expect, test } from "@playwright/test";

test("permite saltar la navegación y enfocar el contenido principal con teclado", async ({ page }) => {
  await page.goto("#/personal");

  const skipLink = page.getByRole("link", { name: "Saltar al contenido principal" });
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();

  const focusStyle = await skipLink.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(focusStyle.outlineStyle).not.toBe("none");
  expect(focusStyle.outlineWidth).toBe("2px");

  await page.keyboard.press("Enter");
  const main = page.getByRole("main");
  await expect(main).toHaveAttribute("id", "main-content");
  await expect(main).toBeFocused();
  await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
});

test("respeta la preferencia de movimiento reducido y mantiene el foco visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("#/personal");

  const scrollBehavior = await page.locator("html").evaluate((element) => getComputedStyle(element).scrollBehavior);
  expect(scrollBehavior).toBe("auto");

  const navigationLink = page.getByRole("link", { name: "Personal", exact: true });
  await navigationLink.focus();
  const outline = await navigationLink.evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outline).not.toBe("none");
});
