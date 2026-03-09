import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({

    server: {
    host: true, // allow external access
    port: 5173,
    allowedHosts: [
      "activity-tracker-dev.izserver24.in"
    ]
  },
  
  plugins: [
    react({
      babel: {},
    }),
    svgr(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.join(__dirname, "src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router")) return "react";
            if (id.includes("@headlessui") || id.includes("@heroicons")) return "ui-libs";
            if (id.includes("dayjs") || id.includes("clsx") || id.includes("sonner")) return "utils";
            return "vendor";
          }
          if (id.includes("/Accordion/")) {
            return "accordion";
          }
        },
      },
    },
  },
});
