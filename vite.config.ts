import analyze from "rollup-plugin-analyzer";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import dts from "vite-plugin-dts";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
      tsconfigPath: "./tsconfig.app.json",
    }),
  ],
  build: {
    sourcemap: "inline",
    minify: false,
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "Nitro Platemap",
      formats: ["es"],
      fileName: (format) => `nitro-platemap.${format}.js`,
    },
    rollupOptions: {
      plugins: [analyze()],
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
        interop: "compat",
      },
    },
  },
  // test: {
  //   globals: true,
  //   environment: "jsdom",
  //   setupFiles: ["./setupTests.ts"],
  //   env: {
  //     mode: "test",
  //     baseUrl: "http://localhost:6006",
  //   },
  // },
});
