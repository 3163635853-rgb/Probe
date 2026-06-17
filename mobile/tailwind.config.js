/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#fafaf9",
        foreground: "#1c1917",
        card: "#ffffff",
        primary: {
          DEFAULT: "#d97706",
          hover: "#b45309",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#f5f5f4",
          hover: "#e7e5e4",
          foreground: "#44403c",
        },
        muted: {
          DEFAULT: "#f5f5f4",
          foreground: "#78716c",
        },
        accent: {
          DEFAULT: "#fef3c7",
          foreground: "#92400e",
        },
        border: "#e7e5e4",
        input: "#e7e5e4",
        ring: "#f59e0b",
        success: "#0d9488",
        destructive: "#dc2626",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
    },
  },
  plugins: [],
};
