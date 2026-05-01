import { useEffect, useState } from 'react';
import GraphView from './components/GraphView'
import brand from "./config/brand";
import type { GraphData, NodeDetails } from './types/graph';
import { fetchGraph } from './api/graphApi';
import NodeDetailsPanel from './components/NodeDetailsPane';
import AppHeader from './components/AppHeader';

document.title = brand.name;

function App() {

  const [data, setData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeDetails | null>(null);

  useEffect(() => {
    async function loadGraph() {
      const graph = await fetchGraph();
      setData(graph);
    }
    loadGraph();
  }, []);

  return (
    <main className="app">
      
      <AppHeader />
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
