const rootCss = document.querySelector(":root");
const currentMode = localStorage.getItem("/settings/effects");

if (!currentMode) localStorage.setItem("/settings/effects", "yes");
else if (currentMode == "no") {
  rootCss.style.setProperty("--terminal-placeholder-color", "#c9c9c9");
  rootCss.style.setProperty("--terminal-color", "#ffffff");
  rootCss.style.setProperty("--text-shadow", "0");
  document.getElementById("term_screen").removeAttribute("effect");
}
