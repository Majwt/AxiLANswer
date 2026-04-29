import './App.css'
import GraphView from './GraphView'

function App() {

  return (
    <main className="app">
      <h1>Server Graph Visualization</h1>
      <section className="graphview-shell">
        <GraphView />
      </section>
    </main>
  )
}

export default App
