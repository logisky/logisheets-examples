# logisheets-runtime example (Node)

A headless example of [`logisheets-runtime`](https://github.com/logisky/LogiSheets/tree/main/packages/runtime)
— the Node counterpart of the browser app. No UI: just the spreadsheet engine
plus a small JSON-RPC server you wire to your own methods.

[`src/main.ts`](./src/main.ts) walks the full loop:

1. **Create** a brand-new workbook in the runtime.
2. **Input** a value (`A1 = 10`) and a formula (`B1 = =A1*2`).
3. **Host** that workbook behind a JSON-RPC server.
4. As an RPC **client**, change `A1` over the wire and read `B1` back — the
   formula's recalculated number — plus a one-call "what-if" that computes
   against a temporary value without persisting it.

Expected output:

```
built workbook 0
  A1 = 10
  B1 = 20 (= A1*2)

hosting workbook 0 at http://127.0.0.1:<port>

rpc: set A1 = 21  →  B1 = 42 (= A1*2, recalculated)
rpc: what-if A1 = 100  →  B1 = 200 (not persisted)
rpc: A1 is still 21 after the what-if

done.
```

## Running it

```bash
npm install
npm start
```

`logisheets-runtime` is a published npm package; it pulls in the Node engine
(`logisheets`, with its WASM) and the shared logic (`logisheets-core`)
automatically. Node 18+ is required (the example uses the built-in `fetch`).

## How it fits together

- `SpreadsheetRuntime` owns many workbooks; `createWorkbook()` / `loadWorkbook(path)`
  give you a `Workbook`.
- `workbook.ops` is the shared, engine-neutral operation layer (`inputCell`,
  `setNumFmt`, validations, …) — the same logic the browser app runs.
- `workbook.getValue(sheet, row, col)` reads a cell's evaluated value (a formula
  cell returns its computed result).
- `RpcServer` is a dependency-free JSON-RPC 2.0 server. You `register()` plain
  methods and `registerMutation()` ones that persist (or roll back, via a per-call
  `save` flag) — then `listen()`.

See the [runtime docs / source](https://github.com/logisky/LogiSheets/tree/main/packages/runtime)
for the full API.
