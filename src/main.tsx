import { render } from 'preact'
import { App } from './App'
import './styles/index.css'
import { initTheme } from './lib/theme'
import { registerServiceWorker } from './lib/pwa'

initTheme()
registerServiceWorker()

render(<App />, document.getElementById('app')!)
