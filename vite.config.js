import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// vite.config.js — This file tells Vite HOW to build our extension
// Think of Vite as a "compiler" — it converts our modern React code
// into plain HTML + JS files that Chrome can actually run

export default defineConfig({
  base: './',         // CRITICAL for Chrome extensions: use relative paths so Chrome can find assets
  plugins: [react()], // This plugin lets Vite understand JSX (React syntax)

  build: {
    outDir: 'dist',       // All built files go into a 'dist' folder
    emptyOutDir: true,    // Clear dist folder before every build

    rollupOptions: {
      // Tell Vite: "There's one entry point — the popup HTML"
      input: {
        popup: resolve(__dirname, 'popup.html'),
      },
      output: {
        // Name the output files in a clean way
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})
