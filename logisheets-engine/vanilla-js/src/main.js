// LogiSheets Engine — Vanilla JS example
// ---------------------------------------
// Shows the full editable-spreadsheet stack with zero framework:
//   1. `Engine`  — the workbook + worker + grid UI (logisheets-engine)
//   2. a formula bar         (logisheets-formula-editor/core + /engine)
//   3. an in-cell editor     (logisheets-formula-editor/inline)
//
// The same three pieces are wired identically in the React / Vue / Angular
// examples — only the component lifecycle differs.

import {Engine} from 'logisheets-engine'
import 'logisheets-engine/style.css'

import {createFormulaEditor} from 'logisheets-formula-editor/core'
import {createEngineFormulaSource} from 'logisheets-formula-editor/engine'
import {createInlineCellEditor} from 'logisheets-formula-editor/inline'
// Note: the formula editor injects its own styles at runtime (CodeMirror), so
// there is no stylesheet to import.

const gridEl = document.getElementById('grid')
const formulaEl = document.getElementById('formula-editor')
const cellRefEl = document.getElementById('cell-ref')

// One engine == one workbook == one worker. It boots a Web Worker that loads
// the WASM core; everything else waits for the `ready` event.
const engine = new Engine()

/**
 * Commit a value or formula into a cell. The engine doesn't invent its own
 * write API — you build a Transaction and hand it to the workbook client.
 * A leading '=' makes the content a formula; anything else is a literal value.
 */
function inputCell(sheetIdx, row, col, content) {
    return engine.getWorkbook().handleTransaction({
        transaction: {
            payloads: [
                {type: 'cellInput', value: {sheetIdx, row, col, content}},
            ],
            undoable: true,
            temp: false,
        },
        // `temp: true` would apply the edit ephemerally (e.g. live preview)
        // without recording it in the undo history.
        temp: false,
    })
}

/** Current sheet name, read fresh (used by the editors for ref coloring). */
const currentSheetName = () =>
    engine.getSheets()[engine.getCurrentSheetIndex()]?.name ?? ''

/** A1-style label for the top-left cell of a selection. */
function a1(selection) {
    const d = selection?.data
    if (!d || d.ty !== 'cellRange') return ''
    const {startRow, startCol} = d.d
    let col = '',
        c = startCol
    do {
        col = String.fromCharCode(65 + (c % 26)) + col
        c = Math.floor(c / 26) - 1
    } while (c >= 0)
    return `${col}${startRow + 1}`
}

engine.on('ready', () => {
    // The default Session owns the on-screen view. Mounting renders the grid,
    // headers, selector, scrollbars and sheet tabs into the container.
    engine.mount(gridEl, {showSheetTabs: true, showScrollbars: true})

    // --- Formula bar -------------------------------------------------------
    // `createEngineFormulaSource` turns the engine's data service into the
    // tokenizer + function-list the editor needs (autocomplete, ref coloring).
    const source = createEngineFormulaSource(engine.getDataService())
    const bar = createFormulaEditor(formulaEl, {
        ...source,
        sheetName: currentSheetName(),
        config: {placeholder: 'Enter a value or =FORMULA', showBorder: true},
        // Enter commits the formula bar into the active cell.
        onSubmit: async (value) => {
            const sel = engine.getSelection()
            if (sel?.data?.ty !== 'cellRange') return
            const {startRow, startCol} = sel.data.d
            await inputCell(engine.getCurrentSheetIndex(), startRow, startCol, value)
        },
    })

    // Reflect the selected cell into the ref box + formula bar contents.
    async function syncFormulaBar(selection) {
        cellRefEl.textContent = a1(selection) || ''
        const d = selection?.data
        if (!d || d.ty !== 'cellRange') return
        const {startRow, startCol} = d.d
        const cell = await engine
            .getDataService()
            .getCellInfo(engine.getCurrentSheetIndex(), startRow, startCol)
        if (cell && typeof cell.getFormula === 'function') {
            const f = cell.getFormula()
            bar.setValue(f ? `=${f}` : cell.getText())
        }
    }
    engine.on('selectionChange', syncFormulaBar)
    engine.on('cellChange', () => syncFormulaBar(engine.getSelection()))

    // --- In-cell editor ----------------------------------------------------
    // Double-clicking / typing into a cell fires `startEdit`; the controller
    // opens a formula editor positioned over that cell, commits via inputCell,
    // and paints reference highlights while editing a formula.
    let inline = null
    function makeInline() {
        inline?.destroy()
        inline = createInlineCellEditor({
            container: gridEl,
            eventSource: engine, // the Engine forwards per-view events
            dataService: engine.getDataService(),
            sheetIdx: engine.getCurrentSheetIndex(),
            getSheetName: currentSheetName,
            inputCell,
            setSelection: (d) => engine.setSelection(d),
            grid: engine.getGrid(),
        })
    }
    makeInline()
    engine.on('gridChange', (g) => inline?.setGrid(g))
    // Re-bind the in-cell editor and formula bar when the active sheet changes.
    engine.on('activeSheetChange', () => {
        makeInline()
        bar.updateOptions({sheetName: currentSheetName()})
    })

    // Seed a couple of cells so there's something to see / edit.
    ;(async () => {
        await inputCell(0, 0, 0, 'Hello')
        await inputCell(0, 0, 1, 'World')
        await inputCell(0, 1, 0, '1')
        await inputCell(0, 1, 1, '2')
        await inputCell(0, 1, 2, '=A2+B2')
        engine.render()
    })()
})
