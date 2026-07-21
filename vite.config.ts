import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  cacheDir: ".vite-cache",
  plugins: [
    react(),
    tailwindcss(),
    dts({
      insertTypesEntry: true,
      rollupTypes: false,
      tsconfigPath: "./tsconfig.app.json",
    }),
  ],
  build: {
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "Nitro Platemap",
      formats: ["es"],
      fileName: (format) => `nitro-platemap.${format}.js`,
    },
    rollupOptions: {
      external: ["react", "react-dom"],
      onwarn(warning, defaultHandler) {
        if (
          warning.code === "INVALID_ANNOTATION" &&
          warning.id?.includes("@daybrush/utils")
        ) {
          return;
        }
        defaultHandler(warning);
      },
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
        interop: "compat",
      },
    },
  },
  test: {
    environment: "jsdom",
  },
});
