import {defineConfig} from 'vite'
import {svelte} from '@sveltejs/vite-plugin-svelte'

// Exclude the pre-bundled engine from Vite's dep optimizer so its inlined
// Web Worker + WASM resolve correctly. (See the vanilla example for details.)
export default defineConfig({
    plugins: [svelte()],
    optimizeDeps: {
        exclude: ['logisheets-engine'],
    },
})
