/**
 * logisheets-runtime — host a workbook over JSON-RPC, then drive it remotely.
 *
 * The runtime is the headless, Node counterpart of the browser app: no UI, just
 * the spreadsheet engine plus a tiny JSON-RPC server you wire to your own
 * methods. This example walks the full loop:
 *
 *   1. Create a brand-new workbook in the runtime.
 *   2. Input a value (A1 = 10) and a formula (B1 = =A1*2).
 *   3. Host that workbook behind a JSON-RPC server.
 *   4. Act as an RPC client: change A1 over the wire and read B1 back — the
 *      formula's recalculated number. Also show a "what-if" RPC that computes
 *      against a temporary value without persisting it.
 *
 * Run with `npm start`.
 */

import {
    SpreadsheetRuntime,
    RpcServer,
    RpcError,
    RPC_INVALID_PARAMS,
    type Workbook,
} from 'logisheets-runtime'

// The engine returns a tagged value (mirrors logisheets-web's `Value`). This
// example only deals with numbers, so narrow to one.
type CellValue =
    | {type: 'str'; value: string}
    | {type: 'bool'; value: boolean}
    | {type: 'number'; value: number}
    | {type: 'error'; value: string}
    | 'empty'

function asNumber(v: CellValue): number {
    if (typeof v !== 'string' && v.type === 'number') return v.value
    throw new Error(`expected a number, got ${JSON.stringify(v)}`)
}

// ---------------------------------------------------------------------------
// 1 + 2: create a workbook and put a value + a formula in it
// ---------------------------------------------------------------------------
const runtime = new SpreadsheetRuntime()
const workbook = runtime.createWorkbook()

// inputCell(sheetIdx, row, col, content) — content is a plain value or a
// formula string (leading "="). Cells are 0-indexed: A1 = (0,0), B1 = (0,1).
await workbook.ops.inputCell(0, 0, 0, '10') // A1 = 10     (value)
await workbook.ops.inputCell(0, 0, 1, '=A1*2') // B1 = =A1*2  (formula)

console.log('built workbook', workbook.id)
console.log('  A1 =', asNumber(workbook.getValue(0, 0, 0)))
console.log('  B1 =', asNumber(workbook.getValue(0, 0, 1)), '(= A1*2)')

// ---------------------------------------------------------------------------
// 3: host the workbook behind a JSON-RPC server
// ---------------------------------------------------------------------------
// RpcServer owns the wire protocol; you define the methods. Their bodies
// read/write workbooks through the injected runtime.
const server = new RpcServer(runtime)

// Look up the workbook a request targets (by id), 404-ing cleanly if missing.
function lookup(id: number): Workbook {
    const found = runtime.workbooks.find((w) => w.id === id)
    if (!found) throw new RpcError(RPC_INVALID_PARAMS, `no workbook ${id}`)
    return found
}

server
    // setCell — write a value/formula into a cell. `registerMutation` wraps the
    // body with a save lifecycle: by default the change is persisted and the
    // workbook's undo history is left clean.
    .registerMutation<{id: number; row: number; col: number; content: string}>(
        'setCell',
        (p) => lookup(p.id),
        async (book, p) => {
            await book.ops.inputCell(0, p.row, p.col, p.content)
        }
    )
    // getCell — read a cell's evaluated value (a formula cell returns its
    // computed result).
    .register<{id: number; row: number; col: number}>('getCell', (p) =>
        lookup(p.id).getValue(0, p.row, p.col)
    )
    // evalWith — set a cell, then read a formula cell, in one round-trip. With
    // `save: false` it's a "what-if": the input is rolled back afterwards so the
    // hosted workbook is untouched. With `save: true` (the default) it sticks.
    .registerMutation<{
        id: number
        inputRow: number
        inputCol: number
        content: string
        formulaRow: number
        formulaCol: number
        save?: boolean
    }>(
        'evalWith',
        (p) => lookup(p.id),
        async (book, p) => {
            await book.ops.inputCell(0, p.inputRow, p.inputCol, p.content)
            return book.getValue(0, p.formulaRow, p.formulaCol)
        }
    )

const addr = await server.listen(0) // port 0 → OS-assigned ephemeral port
const url = `http://127.0.0.1:${addr.port}`
console.log(`\nhosting workbook ${workbook.id} at ${url}\n`)

// ---------------------------------------------------------------------------
// 4: act as an RPC client over HTTP
// ---------------------------------------------------------------------------
async function rpc<T>(method: string, params: unknown): Promise<T> {
    const res = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({jsonrpc: '2.0', id: 1, method, params}),
    })
    const body = (await res.json()) as {result?: T; error?: {message: string}}
    if (body.error) throw new Error(`${method}: ${body.error.message}`)
    return body.result as T
}

const id = workbook.id

// Change A1 from 10 → 21 over the wire...
await rpc('setCell', {id, row: 0, col: 0, content: '21'})
// ...then read the formula's recalculated number back.
const b1 = await rpc<CellValue>('getCell', {id, row: 0, col: 1})
console.log('rpc: set A1 = 21  →  B1 =', asNumber(b1), '(= A1*2, recalculated)')

// What-if in a single call: compute B1 as if A1 were 100, WITHOUT persisting.
const whatIf = await rpc<CellValue>('evalWith', {
    id,
    inputRow: 0,
    inputCol: 0,
    content: '100',
    formulaRow: 0,
    formulaCol: 1,
    save: false,
})
console.log('rpc: what-if A1 = 100  →  B1 =', asNumber(whatIf), '(not persisted)')

// The what-if rolled back, so the hosted A1 is still 21.
const a1 = await rpc<CellValue>('getCell', {id, row: 0, col: 0})
console.log('rpc: A1 is still', asNumber(a1), 'after the what-if')

// ---------------------------------------------------------------------------
// done
// ---------------------------------------------------------------------------
await server.close()
runtime.closeAll()
console.log('\ndone.')
