import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

// `logisheets-engine` is a pre-bundled ES module that spawns a Web Worker and
// loads WASM — exclude it from Vite's dependency pre-bundler so those are
// served as-is. (See the vanilla example for the full explanation.)
export default defineConfig({
    plugins: [react()],
    optimizeDeps: {
        exclude: ['logisheets-engine'],
    },
})
