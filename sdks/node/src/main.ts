/**
 * Minimal LogiSheets Node SDK example (`logisheets`).
 *
 * The Node counterpart of the Rust `sdks/rust` example: create a new workbook,
 * write some numbers and a `SUM` formula, read the recalculated result, and
 * save the workbook to an `.xlsx` file.
 *
 * (For hosting a workbook over JSON-RPC and driving it remotely, see the
 * `logisheets-runtime` example one level up.)
 *
 * Run with `npm start`.
 */

import {writeFileSync} from 'node:fs'
import {Workbook, isErrorMessage} from 'logisheets'
import type {Payload, Transaction, Value} from 'logisheets'

// The engine returns a tagged value; this example only deals with numbers.
function asNumber(v: Value): number {
    if (typeof v !== 'string' && v.type === 'number') return v.value
    throw new Error(`expected a number, got ${JSON.stringify(v)}`)
}

// A cell-input payload. `content` is interpreted automatically: "1" is a
// number, "=SUM(A1:B2)" a formula. Cells are 0-based: A1 = (0,0), B2 = (1,1).
function cellInput(row: number, col: number, content: string): Payload {
    return {type: 'cellInput', value: {sheetIdx: 0, row, col, content}}
}

// 1. A new workbook already contains one sheet, "Sheet1". `logisheets` bundles
//    the WASM engine, so this is ready synchronously — no async init.
const wb = new Workbook()

// 2. Fill A1:B2 with numbers and put =SUM(A1:B2) in A4, all in one transaction.
const tx: Transaction = {
    payloads: [
        cellInput(0, 0, '1'), // A1
        cellInput(1, 0, '2'), // A2
        cellInput(0, 1, '3'), // B1
        cellInput(1, 1, '4'), // B2
        cellInput(3, 0, '=SUM(A1:B2)'), // A4
    ],
    undoable: true,
    temp: false,
}
const effect = wb.execTransaction(tx)
if (effect.status.type === 'err') {
    throw new Error(`edit failed (code ${effect.status.value})`)
}

// 3. Formulas recalculate automatically; read the result of A4.
const a4 = wb.getWorksheet(0).getValue(3, 0)
if (isErrorMessage(a4)) throw new Error('failed to read A4')
console.log(`A4 = SUM(A1:B2) = ${asNumber(a4)}`) // expect 10

// 4. Save to an .xlsx file. `save`'s argument is opaque app data (empty here).
//    The engine returns the bytes as a number array, so wrap in a Buffer.
const saved = wb.save('')
if (saved.code !== 0) throw new Error(`save failed (code ${saved.code})`)
const bytes = Buffer.from(saved.data)
writeFileSync('output.xlsx', bytes)
console.log(`saved ${bytes.length} bytes to output.xlsx`)
