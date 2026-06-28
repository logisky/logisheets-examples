import {defineConfig} from 'vite'

// logisheets-engine ships a pre-bundled ES module that spawns a Web Worker and
// loads a `.wasm` binary via `new URL(..., import.meta.url)`. Vite's dependency
// pre-bundler (esbuild) would rewrite those URLs and break the worker/wasm
// resolution, so we exclude the engine from optimization and let Vite serve it
// as-is. This is the one piece of config every bundler-based host needs.
export default defineConfig({
    optimizeDeps: {
        exclude: ['logisheets-engine'],
    },
    worker: {
        format: 'es',
    },
})
