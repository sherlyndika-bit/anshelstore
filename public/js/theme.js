// Konfigurasi tema Tailwind anshelstore (dipakai semua halaman publik)
tailwind.config = {
  darkMode: "class",
  theme: { extend: {
    colors: {
      "primary": "#e84a8a", "surface-dim": "#d8dadc", "secondary": "#10b981",
      "surface-container": "#eceef0", "outline-variant": "#bdc8d2", "primary-container": "#ff8fbb",
      "tertiary-container": "#5eead4", "on-secondary": "#ffffff", "error": "#ba1a1a",
      "on-secondary-container": "#f0fff6", "inverse-primary": "#ffafd0", "on-surface": "#191c1e",
      "inverse-on-surface": "#eff1f3", "surface": "#f7f9fb", "background": "#f7f9fb",
      "inverse-surface": "#2d3133", "surface-container-highest": "#e0e3e5", "surface-bright": "#f7f9fb",
      "on-primary": "#ffffff", "on-background": "#191c1e", "on-tertiary-container": "#042f2e",
      "on-primary-fixed": "#3d0420", "on-error": "#ffffff", "on-primary-fixed-variant": "#7a0f3d",
      "tertiary": "#0d9488", "surface-container-lowest": "#ffffff", "error-container": "#ffdad6",
      "on-secondary-fixed": "#052e16", "on-secondary-fixed-variant": "#059669", "surface-variant": "#e0e3e5",
      "on-primary-container": "#7a0f3d", "surface-container-high": "#e6e8ea", "tertiary-fixed": "#ccfbf1",
      "secondary-container": "#34d399", "surface-container-low": "#f2f4f6", "tertiary-fixed-dim": "#5eead4",
      "on-tertiary": "#ffffff", "surface-tint": "#e84a8a", "outline": "#6d7881", "primary-fixed-dim": "#ff8fbb",
      "on-surface-variant": "#3d4850", "on-error-container": "#93000a", "secondary-fixed-dim": "#86efac",
      "primary-fixed": "#ffd9e8", "secondary-fixed": "#dcfce7", "on-tertiary-fixed-variant": "#115e59",
      "pink": "#e84a8a", "pink-soft": "#ffd9e8", "pink-50": "#fff0f6", "pink-100": "#ffe3ee", "on-pink": "#7a0f3d"
    },
    borderRadius: { "DEFAULT": "1rem", "lg": "2rem", "xl": "3rem", "full": "9999px" },
    spacing: { "margin-mobile": "16px", "sm": "12px", "gutter": "24px", "md": "24px", "xs": "4px", "lg": "48px", "margin-desktop": "40px", "base": "8px", "xl": "80px" },
    fontFamily: { "display-lg-mobile": ["Plus Jakarta Sans"], "headline-md": ["Plus Jakarta Sans"], "display-lg": ["Plus Jakarta Sans"], "body-lg": ["Plus Jakarta Sans"], "body-md": ["Plus Jakarta Sans"], "headline-lg": ["Plus Jakarta Sans"], "label-sm": ["Inter"], "label-md": ["Inter"] },
    fontSize: {
      "display-lg-mobile": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.02em", "fontWeight": "800" }],
      "headline-md": ["24px", { "lineHeight": "32px", "fontWeight": "700" }],
      "display-lg": ["48px", { "lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "800" }],
      "body-lg": ["18px", { "lineHeight": "28px", "fontWeight": "400" }],
      "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
      "headline-lg": ["32px", { "lineHeight": "40px", "fontWeight": "700" }],
      "label-sm": ["12px", { "lineHeight": "16px", "fontWeight": "500" }],
      "label-md": ["14px", { "lineHeight": "20px", "letterSpacing": "0.01em", "fontWeight": "600" }]
    }
  } }
};
