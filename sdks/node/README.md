# logisheets-sdk (Node)

The smallest possible use of the LogiSheets Node SDK (`logisheets`) — the Node
counterpart of [`sdks/rust`](../rust):

1. create a new workbook,
2. write numbers into `A1:B2` and a `=SUM(A1:B2)` formula into `A4`,
3. read the recalculated result, and
4. save the workbook to `output.xlsx`.

## Run

```bash
npm install
npm start
```

Expected output:

```
A4 = SUM(A1:B2) = 10
saved 5231 bytes to output.xlsx
```

`output.xlsx` is written next to where you run the command and opens in Excel /
LibreOffice / LogiSheets.

## Notes

- `logisheets` is the published Node package — it bundles the WASM engine, so
  no async init is needed: `new Workbook()` is ready to use synchronously.
  Node 18+.
- Cell coordinates are 0-based: `A1` is `row 0, col 0`; `B2` is `row 1, col 1`.
- Cell content is interpreted automatically — `"1"` becomes a number,
  `"=SUM(A1:B2)"` becomes a formula.
- Edits are applied through `execTransaction({payloads, undoable, temp})`;
  grouping several payloads into one transaction makes them a single undoable
  step.
- `save('')` returns `{data, code}`; the argument is opaque app data (unused
  here). The bytes come back as a number array, so wrap them in a `Buffer` to
  write.
- For hosting a workbook over JSON-RPC and driving it remotely, see the
  [`logisheets-runtime`](../../logisheets-runtime) example.
