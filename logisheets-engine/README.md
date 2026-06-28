# logisheets-engine examples

Minimal, runnable examples of embedding [`logisheets-engine`](https://www.npmjs.com/package/logisheets-engine)
— a canvas spreadsheet engine with a WASM core — together with
[`logisheets-formula-editor`](https://www.npmjs.com/package/logisheets-formula-editor),
in four flavors:

| Directory | Stack | Formula editor used |
| --- | --- | --- |
| [`vanilla-js`](./vanilla-js) | Plain JS + Vite | `/core` (framework-agnostic) |
| [`react`](./react) | React 19 + Vite | `<FormulaEditor>` React component |
| [`vue`](./vue) | Vue 3 + Vite | `/core` (framework-agnostic) |
| [`svelte`](./svelte) | Svelte 5 + Vite | `/core` (framework-agnostic) |
| [`angular`](./angular) | Angular 18 | `/core` (framework-agnostic) |

> Note: `logisheets-engine` is itself built with Svelte, but the Svelte example
> still uses the framework-agnostic `Engine` + `createFormulaEditor` path (not
> the engine's internal Svelte components) — that's the supported public API and
> avoids coupling to the engine's bundled Svelte runtime.

Every example renders the **same** thing: an editable spreadsheet with a
formula bar, in-cell editing with autocomplete, and a few seeded cells
(`A1:C2`, where `C2` is `=A2+B2`).

## Requirements

- Node.js 18+
- `logisheets-engine` **>= 1.1.1** and `logisheets-formula-editor` **>= 1.1.0**
  (resolved from npm automatically by each example's `package.json`).

## Run an example

```bash
cd react        # or vanilla-js / vue / svelte / angular
npm install
npm run dev
```

Then open the URL the dev server prints.

## How the pieces fit together

All four examples follow the identical three-part recipe; only the
component lifecycle (how/when the code runs) differs per framework.

1. **Engine** — one `Engine` instance owns the workbook, a Web Worker, and the
   canvas grid UI. Wait for its `ready` event, then `engine.mount(container)`
   to render the grid (headers, selection, scrollbars, sheet tabs).

   ```js
   import {Engine} from 'logisheets-engine'
   import 'logisheets-engine/style.css'

   const engine = new Engine()
   engine.on('ready', () => engine.mount(document.getElementById('grid')))
   ```

2. **Writing cells** — the engine has no bespoke "set cell" call; you build a
   transaction and hand it to the workbook client. A leading `=` makes the
   content a formula.

   ```js
   engine.getWorkbook().handleTransaction({
     transaction: {
       payloads: [{type: 'cellInput', value: {sheetIdx, row, col, content}}],
       undoable: true,
       temp: false,
     },
     temp: false,
   })
   ```

3. **Formula editor** — `createEngineFormulaSource(engine.getDataService())`
   wires the editor's tokenizer + function list to the engine. Use it for:
   - a **formula bar** (`createFormulaEditor` from `/core`, or the `<FormulaEditor>`
     React component), and
   - an **in-cell editor** (`createInlineCellEditor` from `/inline`), which
     listens for the grid's `startEdit` events and opens an editor over the
     target cell. Keep it in sync with `engine.on('gridChange', g => inline.setGrid(g))`.

See each example's source (`src/`) for the full, commented wiring.

## Bundler notes (important)

`logisheets-engine` ships as a pre-built ES module that spawns a Web Worker
and loads its WASM core. Two things every host should know:

- **Vite**: exclude the engine from dependency pre-bundling so the worker/WASM
  resolve correctly:

  ```js
  // vite.config.*
  export default defineConfig({
    optimizeDeps: {exclude: ['logisheets-engine']},
  })
  ```

- **Angular**: the engine bundle is large; the `angular.json` here raises the
  build budgets and enables the `zone.js` polyfill. No worker/WASM config is
  needed — both are inlined into the engine bundle.

- The formula editor injects its own styles at runtime (CodeMirror), so there
  is **no stylesheet to import** from `logisheets-formula-editor`.

- The grid container must have an explicit size (the canvas fills it).
