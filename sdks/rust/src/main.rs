//! Minimal LogiSheets Rust SDK example.
//!
//! Creates a new workbook, writes some numbers and a `SUM` formula, reads the
//! recalculated result, and saves the workbook to an `.xlsx` file.
//!
//! Run with:  cargo run

use logisheets_rs::{CellInput, EditAction, PayloadsAction, StatusCode, Value, Workbook};

/// Build a `CellInput` payload. `content` is interpreted automatically:
/// `"12"` becomes a number, `"=SUM(A1:B2)"` becomes a formula, etc.
fn cell(sheet_idx: usize, row: usize, col: usize, content: &str) -> CellInput {
    CellInput {
        sheet_idx,
        row,
        col,
        content: content.to_string(),
    }
}

fn main() {
    // 1. A new workbook already contains one sheet named "Sheet1".
    let mut wb = Workbook::default();

    // 2. Fill A1:B2 with numbers and put =SUM(A1:B2) in A4.
    //    (row/col are 0-based: A1 = row 0 col 0, B2 = row 1 col 1.)
    let action = PayloadsAction::new()
        .add_payload(cell(0, 0, 0, "1")) // A1
        .add_payload(cell(0, 1, 0, "2")) // A2
        .add_payload(cell(0, 0, 1, "3")) // B1
        .add_payload(cell(0, 1, 1, "4")) // B2
        .add_payload(cell(0, 3, 0, "=SUM(A1:B2)")) // A4
        .set_undoable(true);

    let effect = wb.handle_action(EditAction::Payloads(action));
    if let StatusCode::Err(code) = effect.status {
        panic!("failed to apply edits: {:?}", code);
    }

    // 3. Read the recalculated value of the formula cell A4.
    let ws = wb.get_sheet_by_idx(0).expect("sheet 0 exists");
    let a4 = ws.get_cell_info(3, 0).expect("A4 readable");
    match a4.value {
        Value::Number(n) => println!("A4 = SUM(A1:B2) = {}", n), // expect 10
        other => println!("A4 = {:?}", other),
    }

    // 4. Save to an .xlsx file.
    let bytes = wb.save().expect("save workbook");
    let path = "output.xlsx";
    std::fs::write(path, &bytes).expect("write file");
    println!("saved {} bytes to {}", bytes.len(), path);
}
