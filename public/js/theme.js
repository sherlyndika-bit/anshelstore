// Konfigurasi tema Tailwind anshelstore (dipakai semua halaman publik)
tailwind.config = {
  darkMode: "class",
  theme: { extend: {
    colors: {
      "primary": "#e84a8a", "surface-dim": "#0a0c10", "secondary": "#10b981",
      "surface-container": "#1c2029", "outline-variant": "#2a303b", "primary-container": "#ff8fbb",
      "tertiary-container": "#5eead4", "on-secondary": "#ffffff", "error": "#ffb4ab",
      "on-secondary-container": "#f0fff6", "inverse-primary": "#ffafd0", "on-surface": "#e7e9ee",
      "inverse-on-surface": "#1c2029", "surface": "#0d0f14", "background": "#0d0f14",
      "inverse-surface": "#e7e9ee", "surface-container-highest": "#2c313d", "surface-bright": "#20242e",
      "on-primary": "#ffffff", "on-background": "#e7e9ee", "on-tertiary-container": "#042f2e",
      "on-primary-fixed": "#3d0420", "on-error": "#690005", "on-primary-fixed-variant": "#7a0f3d",
      "tertiary": "#5eead4", "surface-container-lowest": "#14171e", "error-container": "#93000a",
      "on-secondary-fixed": "#052e16", "on-secondary-fixed-variant": "#059669", "surface-variant": "#242833",
      "on-primary-container": "#ffd9e8", "surface-container-high": "#242833", "tertiary-fixed": "#ccfbf1",
      "secondary-container": "#0f3d30", "surface-container-low": "#171b22", "tertiary-fixed-dim": "#5eead4",
      "on-tertiary": "#042f2e", "surface-tint": "#e84a8a", "outline": "#3b424f", "primary-fixed-dim": "#ff8fbb",
      "on-surface-variant": "#a8b0bd", "on-error-container": "#ffdad6", "secondary-fixed-dim": "#86efac",
      "primary-fixed": "#3a0a20", "secondary-fixed": "#0f3d30", "on-tertiary-fixed-variant": "#115e59",
      "pink": "#ff5fa2", "pink-soft": "#3a0a20", "pink-50": "#2a0c1a", "pink-100": "#3a1124", "on-pink": "#ffd9e8"
    },
    borderRadius: { "DEFAULT": "1rem", "lg": "2rem", "xl": "3rem", "full": "9999px" },
    spacing: { "margin-mobile": "16px", "sm": "12px", "gutter": "24px", "md": "24px", "xs": "4px", "lg": "48px", "margin-desktop": "40px", "base": "8px", "xl": "80px", "2xl": "120px" },
    fontFamily: { "display-lg-mobile": ["Plus Jakarta Sans"], "headline-md": ["Plus Jakarta Sans"], "display-lg": ["Plus Jakarta Sans"], "body-lg": ["Plus Jakarta Sans"], "body-md": ["Plus Jakarta Sans"], "headline-lg": ["Plus Jakarta Sans"], "label-sm": ["Inter"], "label-md": ["Inter"], "label-lg": ["Inter"] },
    fontSize: {
      "display-lg-mobile": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.02em", "fontWeight": "800" }],
      "headline-md": ["24px", { "lineHeight": "32px", "fontWeight": "700" }],
      "display-lg": ["48px", { "lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "800" }],
      "body-lg": ["18px", { "lineHeight": "28px", "fontWeight": "400" }],
      "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
      "headline-lg": ["32px", { "lineHeight": "40px", "fontWeight": "700" }],
      "label-sm": ["12px", { "lineHeight": "16px", "fontWeight": "500" }],
      "label-lg": ["16px", { "lineHeight": "24px", "letterSpacing": "0.01em", "fontWeight": "600" }],
      "label-md": ["14px", { "lineHeight": "20px", "letterSpacing": "0.01em", "fontWeight": "600" }]
    }
  } }
};
