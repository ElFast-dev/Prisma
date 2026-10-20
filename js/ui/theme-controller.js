const THEME_KEY = "prisma:theme";
const VALID_THEMES = new Set(["dark", "light"]);

export function createThemeController(ctx) {
  let currentTheme = "dark";

  function normalizeTheme(value) {
    return VALID_THEMES.has(value) ? value : "dark";
  }

  function applyTheme(theme) {
    currentTheme = normalizeTheme(theme);
    ctx.document.documentElement.dataset.theme = currentTheme;
    const themeColor = ctx.document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute("content", currentTheme === "dark" ? "#050505" : "#f4f5f7");
    return currentTheme;
  }

  function initialize() {
    let storedTheme = null;
    try {
      storedTheme = ctx.window.localStorage.getItem(THEME_KEY);
    } catch (_) {
      storedTheme = null;
    }
    return applyTheme(storedTheme);
  }

  function setTheme(theme) {
    const selected = normalizeTheme(theme);
    applyTheme(selected);
    try {
      ctx.window.localStorage.setItem(THEME_KEY, selected);
    } catch (_) {
      // La apariencia se puede cambiar incluso si el navegador bloquea la persistencia.
    }
    return currentTheme;
  }

  function getTheme() {
    return currentTheme;
  }

  return { initialize, setTheme, getTheme };
}
