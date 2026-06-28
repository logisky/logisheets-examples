import type {Engine, SelectedData} from 'logisheets-engine'

/**
 * Commit a value or formula into a cell. The engine has no bespoke write API —
 * you build a Transaction and hand it to the workbook client. A leading '='
 * makes the content a formula; otherwise it's a literal value.
 */
export function inputCell(
    engine: Engine,
    sheetIdx: number,
    row: number,
    col: number,
    content: string
) {
    return engine.getWorkbook().handleTransaction({
        transaction: {
            payloads: [{type: 'cellInput', value: {sheetIdx, row, col, content}}],
            undoable: true,
            temp: false,
        },
        // `temp: true` would apply the edit ephemerally (e.g. live preview)
        // without recording it in the undo history.
        temp: false,
    })
}

/** A1-style label for the top-left cell of a selection (e.g. "B3"). */
export function a1(selection: SelectedData | undefined): string {
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
