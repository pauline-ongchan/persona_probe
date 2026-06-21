import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        mist: "#f5f7fa",
        moss: "#3c6e47",
        coral: "#cf5f45",
        amber: "#d89a2b"
      }
    }
  },
  plugins: []
};

export default config;
