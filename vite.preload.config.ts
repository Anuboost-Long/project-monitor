import path from "node:path";

import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
	build: {
		outDir: "dist-electron",
		emptyOutDir: false,
		lib: {
			entry: path.resolve(__dirname, "src/preload.ts"),
			formats: ["cjs"],
			fileName: () => "preload.js",
		},
		rollupOptions: {
			external: (id) => !id.startsWith(".") && !path.isAbsolute(id),
		},
	},
});
