// Konfigurasi tema Tailwind anshelstore (dipakai semua halaman publik)
tailwind.config = {
  darkMode: "class",
  theme: { extend: {
    colors: {
      "primary": "#bf5d7e", "surface-dim": "#ece0d8", "secondary": "#7d9b78",
      "surface-container": "#f6ece4", "outline-variant": "#e6d8d0", "primary-container": "#f3c6d5",
      "tertiary-container": "#ead6c4", "on-secondary": "#ffffff", "error": "#ba1a1a",
      "on-secondary-container": "#16240f", "inverse-primary": "#ffb1c8", "on-surface": "#3a2f33",
      "inverse-on-surface": "#fbf0f3", "surface": "#fbf5f0", "background": "#fbf5f0",
      "inverse-surface": "#352e30", "surface-container-highest": "#ead9cf", "surface-bright": "#fffdfb",
      "on-primary": "#ffffff", "on-background": "#3a2f33", "on-tertiary-container": "#3a2a1a",
      "on-primary-fixed": "#3f0d1f", "on-error": "#ffffff", "on-primary-fixed-variant": "#7d2f49",
      "tertiary": "#b08968", "surface-container-lowest": "#ffffff", "error-container": "#ffdad6",
      "on-secondary-fixed": "#16240f", "on-secondary-fixed-variant": "#3f5a39", "surface-variant": "#ece0d8",
      "on-primary-container": "#7d2f49", "surface-container-high": "#f0e5db", "tertiary-fixed": "#f0e2d6",
      "secondary-container": "#bcd4b7", "surface-container-low": "#fbf3ec", "tertiary-fixed-dim": "#e0c9b4",
      "on-tertiary": "#ffffff", "surface-tint": "#bf5d7e", "outline": "#a89aa0", "primary-fixed-dim": "#f3c6d5",
      "on-surface-variant": "#8a7a80", "on-error-container": "#410002", "secondary-fixed-dim": "#bcd4b7",
      "primary-fixed": "#fbe1e9", "secondary-fixed": "#e2efe0", "on-tertiary-fixed-variant": "#6b4f38",
      "pink": "#cf7e98", "pink-soft": "#fbe1e9", "pink-50": "#fdf3f6", "pink-100": "#fbe7ee", "on-pink": "#7d2f49"
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
