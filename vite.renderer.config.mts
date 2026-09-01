import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	// Packaged index.html is loaded via loadFile() over the file:// protocol,
	// where a root-absolute asset path (Vite's default) resolves against the
	// filesystem root instead of the html file's own directory.
	base: "./",
	build: {
		outDir: "dist",
	},
	server: {
		port: 5273,
		strictPort: true,
	},
});
