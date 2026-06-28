import {createRoot} from 'react-dom/client'
import App from './App'

// Note: no <StrictMode> here. In dev it double-invokes effects, which would
// spin up (and tear down) two engines/workers and race the async seeding.
createRoot(document.getElementById('root')!).render(<App />)
