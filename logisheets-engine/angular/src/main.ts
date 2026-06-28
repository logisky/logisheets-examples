import {bootstrapApplication} from '@angular/platform-browser'
import {SpreadsheetComponent} from './app/spreadsheet.component'

// The spreadsheet component IS the root here — it fills <app-root>.
bootstrapApplication(SpreadsheetComponent).catch((err) => console.error(err))
