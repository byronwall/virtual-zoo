export const globalCss = {
  extend: {
    "*": {
      "--global-color-border": "colors.border",
      "--global-color-placeholder": "colors.fg.subtle",
      "--global-color-selection": "colors.colorPalette.subtle.bg",
      "--global-color-focus-ring": "colors.colorPalette.solid.bg",
    },
    html: {
      colorPalette: "orange",
      fontFamily: "Fredoka, ui-rounded, system-ui, sans-serif",
    },
    body: {
      background: "canvas",
      color: "fg.default",
      fontWeight: "450",
    },
    "input, textarea, select, button": {
      font: "inherit",
    },
    "input, textarea, select, [contenteditable=''], [contenteditable='true']": {
      fontSize: "max(1rem, 16px)",
    },
  },
};
