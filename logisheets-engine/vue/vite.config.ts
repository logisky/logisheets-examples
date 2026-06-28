import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'

// Exclude the pre-bundled engine from Vite's dep optimizer so its inlined
// Web Worker + WASM resolve correctly. (See the vanilla example for details.)
export default defineConfig({
    plugins: [vue()],
    optimizeDeps: {
        exclude: ['logisheets-engine'],
    },
})
