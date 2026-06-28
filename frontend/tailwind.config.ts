import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#2A2520",
        sub: "#6B6258",
        paper: "#F6F1E9",
        cream: "#EFE7DA",
        blush: "#E8C9C1",
        blushDeep: "#D9A99E",
        brass: "#B08D57",
        sage: "#9CA98C",
        line: "#E5DCCF",
      },
      fontFamily: {
        serif: ["Lora", "Georgia", "serif"],
        sans: ["'Be Vietnam Pro'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
