import './App.css'
import BoxelEditor from './components/BoxelEditor'

function App(): JSX.Element {
  const gridSize = { x: 32, y: 32, z: 1 }

  return (
    <div className="app">
      <BoxelEditor gridSize={gridSize} />
    </div>
  )
}

export default App
