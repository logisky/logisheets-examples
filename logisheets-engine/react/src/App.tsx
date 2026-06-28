import {useEffect, useRef, useState} from 'react'
import {Engine} from 'logisheets-engine'
import type {SelectedData} from 'logisheets-engine'
import 'logisheets-engine/style.css'

import {FormulaEditor} from 'logisheets-formula-editor'
import type {FormulaEditorRef} from 'logisheets-formula-editor'
import {createEngineFormulaSource} from 'logisheets-formula-editor/engine'
import type {EngineFormulaSource} from 'logisheets-formula-editor/engine'
import {createInlineCellEditor} from 'logisheets-formula-editor/inline'
import type {InlineCellEditorHandle} from 'logisheets-formula-editor/inline'

import {inputCell, a1} from './engine-utils'

// React example: the engine lives in a ref (it owns a worker + canvas, so it
// must persist across renders), and React state mirrors only what the UI
// chrome needs — the selected cell label and formula-bar contents.
export default function App() {
    const gridRef = useRef<HTMLDivElement>(null)
    const engineRef = useRef<Engine | null>(null)
    const inlineRef = useRef<InlineCellEditorHandle | null>(null)
    const editorRef = useRef<FormulaEditorRef>(null)

    const [source, setSource] = useState<EngineFormulaSource | null>(null)
    const [cellRef, setCellRef] = useState('')
    const [sheetName, setSheetName] = useState('Sheet1')

    useEffect(() => {
        const engine = new Engine()
        engineRef.current = engine

        const currentSheetName = () =>
            engine.getSheets()[engine.getCurrentSheetIndex()]?.name ?? ''

        // Reflect the active cell into the ref box + formula-bar contents.
        const syncBar = async (selection: SelectedData) => {
            setCellRef(a1(selection))
            const d = selection?.data
            if (!d || d.ty !== 'cellRange') return
            const {startRow, startCol} = d.d
            const cell = await engine
                .getDataService()
                .getCellInfo(engine.getCurrentSheetIndex(), startRow, startCol)
            if (cell && typeof (cell as any).getFormula === 'function') {
                const f = (cell as any).getFormula()
                editorRef.current?.setValue(f ? `=${f}` : (cell as any).getText())
            }
        }

        const makeInline = () => {
            inlineRef.current?.destroy()
            inlineRef.current = createInlineCellEditor({
                container: gridRef.current!,
                eventSource: engine,
                dataService: engine.getDataService(),
                sheetIdx: engine.getCurrentSheetIndex(),
                getSheetName: currentSheetName,
                inputCell: (s, r, c, t) => inputCell(engine, s, r, c, t),
                setSelection: (sel) => engine.setSelection(sel),
                grid: engine.getGrid(),
            })
        }

        const onReady = () => {
            engine.mount(gridRef.current!, {
                showSheetTabs: true,
                showScrollbars: true,
            })
            setSource(createEngineFormulaSource(engine.getDataService()))
            setSheetName(currentSheetName())
            makeInline()

            engine.on('gridChange', (g) => inlineRef.current?.setGrid(g))
            engine.on('selectionChange', syncBar)
            engine.on('cellChange', () => syncBar(engine.getSelection()))
            engine.on('activeSheetChange', () => {
                makeInline()
                setSheetName(currentSheetName())
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
        }

        engine.on('ready', onReady)
        return () => {
            inlineRef.current?.destroy()
            engine.destroy()
        }
    }, [])

    const onSubmit = async (value: string) => {
        const engine = engineRef.current
        if (!engine) return
        const sel = engine.getSelection()
        if (sel?.data?.ty !== 'cellRange') return
        const {startRow, startCol} = sel.data.d
        await inputCell(engine, engine.getCurrentSheetIndex(), startRow, startCol, value)
    }

    return (
        <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
            <div
                style={{
                    display: 'flex',
                    gap: 8,
                    height: 34,
                    padding: '4px 8px',
                    borderBottom: '1px solid #e0e0e0',
                    background: '#fafafa',
                    alignItems: 'stretch',
                }}
            >
                <div
                    style={{
                        width: 90,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'monospace',
                        fontSize: 13,
                        border: '1px solid #e0e0e0',
                        borderRadius: 4,
                        background: '#fff',
                    }}
                >
                    {cellRef}
                </div>
                <div style={{flex: 1}}>
                    {source && (
                        <FormulaEditor
                            ref={editorRef}
                            {...source}
                            sheetName={sheetName}
                            onSubmit={onSubmit}
                            config={{
                                placeholder: 'Enter a value or =FORMULA',
                                showBorder: true,
                            }}
                        />
                    )}
                </div>
            </div>
            <div ref={gridRef} style={{flex: 1, position: 'relative', minHeight: 0}} />
        </div>
    )
}
