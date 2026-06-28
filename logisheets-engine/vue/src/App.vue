<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from 'vue'
import {Engine} from 'logisheets-engine'
import type {SelectedData} from 'logisheets-engine'
import 'logisheets-engine/style.css'

import {createFormulaEditor} from 'logisheets-formula-editor/core'
import type {FormulaEditorHandle} from 'logisheets-formula-editor/core'
import {createEngineFormulaSource} from 'logisheets-formula-editor/engine'
import {createInlineCellEditor} from 'logisheets-formula-editor/inline'
import type {InlineCellEditorHandle} from 'logisheets-formula-editor/inline'

import {inputCell, a1} from './engine-utils'

const gridEl = ref<HTMLDivElement | null>(null)
const formulaEl = ref<HTMLDivElement | null>(null)
const cellRef = ref('')

let engine: Engine | null = null
let bar: FormulaEditorHandle | null = null
let inline: InlineCellEditorHandle | null = null

onMounted(() => {
    engine = new Engine()
    const eng = engine

    const currentSheetName = () =>
        eng.getSheets()[eng.getCurrentSheetIndex()]?.name ?? ''

    const syncBar = async (selection: SelectedData) => {
        cellRef.value = a1(selection)
        const d = selection?.data
        if (!d || d.ty !== 'cellRange') return
        const {startRow, startCol} = d.d
        const cell = await eng
            .getDataService()
            .getCellInfo(eng.getCurrentSheetIndex(), startRow, startCol)
        if (cell && typeof (cell as any).getFormula === 'function') {
            const f = (cell as any).getFormula()
            bar?.setValue(f ? `=${f}` : (cell as any).getText())
        }
    }

    const makeInline = () => {
        inline?.destroy()
        inline = createInlineCellEditor({
            container: gridEl.value!,
            eventSource: eng,
            dataService: eng.getDataService(),
            sheetIdx: eng.getCurrentSheetIndex(),
            getSheetName: currentSheetName,
            inputCell: (s, r, c, t) => inputCell(eng, s, r, c, t),
            setSelection: (sel) => eng.setSelection(sel),
            grid: eng.getGrid(),
        })
    }

    eng.on('ready', () => {
        eng.mount(gridEl.value!, {showSheetTabs: true, showScrollbars: true})

        const source = createEngineFormulaSource(eng.getDataService())
        bar = createFormulaEditor(formulaEl.value!, {
            ...source,
            sheetName: currentSheetName(),
            config: {placeholder: 'Enter a value or =FORMULA', showBorder: true},
            onSubmit: async (value) => {
                const sel = eng.getSelection()
                if (sel?.data?.ty !== 'cellRange') return
                const {startRow, startCol} = sel.data.d
                await inputCell(eng, eng.getCurrentSheetIndex(), startRow, startCol, value)
            },
        })

        makeInline()
        eng.on('gridChange', (g) => inline?.setGrid(g))
        eng.on('selectionChange', syncBar)
        eng.on('cellChange', () => syncBar(eng.getSelection()))
        eng.on('activeSheetChange', () => {
            makeInline()
            bar?.updateOptions({sheetName: currentSheetName()})
        })

        // Seed some content (A1:C2) so there's something to see / edit.
        ;(async () => {
            await inputCell(eng, 0, 0, 0, 'Hello')
            await inputCell(eng, 0, 0, 1, 'World')
            await inputCell(eng, 0, 1, 0, '1')
            await inputCell(eng, 0, 1, 1, '2')
            await inputCell(eng, 0, 1, 2, '=A2+B2')
            eng.render()
        })()
    })
})

onBeforeUnmount(() => {
    inline?.destroy()
    bar?.destroy()
    engine?.destroy()
})
</script>

<template>
    <div class="layout">
        <div class="formula-bar">
            <div class="cell-ref">{{ cellRef }}</div>
            <div ref="formulaEl" class="formula-editor"></div>
        </div>
        <div ref="gridEl" class="grid"></div>
    </div>
</template>

<style scoped>
.layout {
    display: flex;
    flex-direction: column;
    height: 100%;
}
.formula-bar {
    display: flex;
    align-items: stretch;
    gap: 8px;
    height: 34px;
    padding: 4px 8px;
    border-bottom: 1px solid #e0e0e0;
    background: #fafafa;
}
.cell-ref {
    width: 90px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: monospace;
    font-size: 13px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background: #fff;
}
.formula-editor {
    flex: 1;
}
.grid {
    flex: 1;
    position: relative;
    min-height: 0;
}
</style>
