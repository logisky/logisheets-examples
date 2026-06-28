import {
    AfterViewInit,
    Component,
    ElementRef,
    OnDestroy,
    ViewChild,
} from '@angular/core'
import {Engine} from 'logisheets-engine'
import type {SelectedData} from 'logisheets-engine'

import {createFormulaEditor} from 'logisheets-formula-editor/core'
import type {FormulaEditorHandle} from 'logisheets-formula-editor/core'
import {createEngineFormulaSource} from 'logisheets-formula-editor/engine'
import {createInlineCellEditor} from 'logisheets-formula-editor/inline'
import type {InlineCellEditorHandle} from 'logisheets-formula-editor/inline'

import {inputCell, a1} from '../engine-utils'

@Component({
    selector: 'app-root',
    standalone: true,
    template: `
        <div class="layout">
            <div class="formula-bar">
                <div class="cell-ref">{{ cellRef }}</div>
                <div #formula class="formula-editor"></div>
            </div>
            <div #grid class="grid"></div>
        </div>
    `,
    styles: [
        `
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
        `,
    ],
})
export class SpreadsheetComponent implements AfterViewInit, OnDestroy {
    @ViewChild('grid', {static: true}) gridRef!: ElementRef<HTMLDivElement>
    @ViewChild('formula', {static: true}) formulaRef!: ElementRef<HTMLDivElement>

    cellRef = ''

    private engine: Engine | null = null
    private bar: FormulaEditorHandle | null = null
    private inline: InlineCellEditorHandle | null = null

    ngAfterViewInit(): void {
        const engine = new Engine()
        this.engine = engine

        const currentSheetName = () =>
            engine.getSheets()[engine.getCurrentSheetIndex()]?.name ?? ''

        const syncBar = async (selection: SelectedData) => {
            this.cellRef = a1(selection)
            const d = selection?.data
            if (!d || d.ty !== 'cellRange') return
            const {startRow, startCol} = d.d
            const cell = await engine
                .getDataService()
                .getCellInfo(engine.getCurrentSheetIndex(), startRow, startCol)
            if (cell && typeof (cell as any).getFormula === 'function') {
                const f = (cell as any).getFormula()
                this.bar?.setValue(f ? `=${f}` : (cell as any).getText())
            }
        }

        const makeInline = () => {
            this.inline?.destroy()
            this.inline = createInlineCellEditor({
                container: this.gridRef.nativeElement,
                eventSource: engine,
                dataService: engine.getDataService(),
                sheetIdx: engine.getCurrentSheetIndex(),
                getSheetName: currentSheetName,
                inputCell: (s, r, c, t) => inputCell(engine, s, r, c, t),
                setSelection: (sel) => engine.setSelection(sel),
                grid: engine.getGrid(),
            })
        }

        engine.on('ready', () => {
            engine.mount(this.gridRef.nativeElement, {
                showSheetTabs: true,
                showScrollbars: true,
            })

            const source = createEngineFormulaSource(engine.getDataService())
            this.bar = createFormulaEditor(this.formulaRef.nativeElement, {
                ...source,
                sheetName: currentSheetName(),
                config: {
                    placeholder: 'Enter a value or =FORMULA',
                    showBorder: true,
                },
                onSubmit: async (value) => {
                    const sel = engine.getSelection()
                    if (sel?.data?.ty !== 'cellRange') return
                    const {startRow, startCol} = sel.data.d
                    await inputCell(
                        engine,
                        engine.getCurrentSheetIndex(),
                        startRow,
                        startCol,
                        value
                    )
                },
            })

            makeInline()
            engine.on('gridChange', (g) => this.inline?.setGrid(g))
            engine.on('selectionChange', syncBar)
            engine.on('cellChange', () => syncBar(engine.getSelection()))
            engine.on('activeSheetChange', () => {
                makeInline()
                this.bar?.updateOptions({sheetName: currentSheetName()})
            })

            // Seed some content (A1:C2) so there's something to see / edit.
            ;(async () => {
                await inputCell(engine, 0, 0, 0, 'Hello')
                await inputCell(engine, 0, 0, 1, 'World')
                await inputCell(engine, 0, 1, 0, '1')
                await inputCell(engine, 0, 1, 1, '2')
                await inputCell(engine, 0, 1, 2, '=A2+B2')
                engine.render()
            })()
        })
    }

    ngOnDestroy(): void {
        this.inline?.destroy()
        this.bar?.destroy()
        this.engine?.destroy()
    }
}
