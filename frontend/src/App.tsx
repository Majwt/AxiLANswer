import './App.css'
import GraphView from './components/GraphView'
import brand from "./config/brand";

document.title = brand.name;

function App() {

  return (
    <main className="app">
      <h1>{brand.name}</h1>
      <p>{brand.description}</p>
      <section className="graphview-shell">
        <GraphView />
      </section>
    </main>
  )
}

export default App
