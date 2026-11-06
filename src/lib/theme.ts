export const THEME_STORAGE_KEY = "theme";

/**
 * Runs in <head> before first paint so the page never flashes the wrong theme.
 * A stored choice wins; otherwise the system preference decides.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})()`;
