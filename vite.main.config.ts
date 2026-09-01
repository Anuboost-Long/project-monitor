import path from "node:path";

import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
	build: {
		outDir: "dist-electron",
		emptyOutDir: false,
		lib: {
			entry: path.resolve(__dirname, "src/main.ts"),
			formats: ["cjs"],
			fileName: () => "main.js",
		},
		rollupOptions: {
			// electron, node builtins, and node-pty must stay real `require()`
			// calls rather than get bundled — they're resolved from node_modules
			// (or Electron itself) at runtime, not shipped as source.
			external: (id) => !id.startsWith(".") && !path.isAbsolute(id),
		},
	},
});
