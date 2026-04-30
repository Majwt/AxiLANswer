import { useEffect, useState } from 'react';
import './App.css'
import GraphView from './components/GraphView'
import brand from "./config/brand";
import type { GraphData } from './types/graph';
import { fetchGraph } from './api/graphApi';

document.title = brand.name;

function App() {

  const [data, setData] = useState<GraphData | null>(null);

  useEffect(() => {
    async function loadGraph() {
      const graph = await fetchGraph();
      setData(graph);
    }
    loadGraph();
  }, []);

  return (
    <main className="app">
      <h1>{brand.name}</h1>
      <p>{brand.description}</p>
      <section className="graphview-shell">
        {data ? <GraphView data={data} /> : <p>Loading graph...</p>}
      </section>
    </main>
  )
}

export default App
