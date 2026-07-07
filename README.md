# logisheets-examples

Runnable integration examples for [LogiSheets](https://github.com/logisky/LogiSheets).

- [**logisheets-engine**](./logisheets-engine) — embedding the spreadsheet
  engine + formula editor in plain JS, React, Vue, and Angular.
- [**logisheets-runtime**](./logisheets-runtime) — the headless Node runtime:
  build a workbook, host it over JSON-RPC, and drive it remotely (change a
  value, read a formula's recalculated number).
- [**sdks**](./sdks) — using the LogiSheets SDKs directly (headless, no UI) to
  create a workbook, write values and a `SUM` formula, read the recalculated
  result, and save to `.xlsx`:
  - [**sdks/rust**](./sdks/rust) — the Rust SDK (`logisheets-rs`).
  - [**sdks/node**](./sdks/node) — the Node SDK (`logisheets-runtime`).
