# logisheets-sdk (Rust)

The smallest possible use of the LogiSheets Rust SDK (`logisheets-rs`):

1. create a new workbook,
2. write numbers into `A1:B2` and a `=SUM(A1:B2)` formula into `A4`,
3. read the recalculated result, and
4. save the workbook to `output.xlsx`.

## Run

```bash
cargo run
```

Expected output:

```
A4 = SUM(A1:B2) = 10
saved 5202 bytes to output.xlsx
```

`output.xlsx` is written next to where you run the command and opens in Excel /
LibreOffice / LogiSheets.

## Notes

- The example depends on the published `logisheets-rs` crate from crates.io, so
  it's fully self-contained — you can copy this directory anywhere and
  `cargo run`.
- Cell coordinates are 0-based: `A1` is `row 0, col 0`; `B2` is `row 1, col 1`.
- Cell content is interpreted automatically — `"1"` becomes a number,
  `"=SUM(A1:B2)"` becomes a formula.
- Edits are applied through `handle_action(EditAction::Payloads(..))`; grouping
  several `CellInput`s into one `PayloadsAction` makes them a single
  undoable step.
