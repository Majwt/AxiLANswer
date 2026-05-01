import { useEffect, useState } from 'react';
import './App.css'
import GraphView from './components/GraphView'
import brand from "./config/brand";
import type { GraphData } from './types/graph';
import { fetchGraph } from './api/graphApi';
import NodeDetailsPanel from './components/NodeDetailsPane';

document.title = brand.name;

function App() {

  const [data, setData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  useEffect(() => {
    async function loadGraph() {
      const graph = await fetchGraph();
      setData(graph);
    }
    loadGraph();
  }, []);

  return (
    <main className="app">
      <header className="app-header">
        <h1>{brand.name}</h1>
        <p>{brand.description}</p>
      </header>
      <section className="app-content">
        <div className="graphview-shell">
          {data ? <GraphView data={data} onSelectNode={(_node, attrs) => setSelectedNode(attrs)} /> : <p>Loading graph...</p>}
        </div>
        <NodeDetailsPanel node={selectedNode} />
      </section>
    </main>
  )
}

export default App
