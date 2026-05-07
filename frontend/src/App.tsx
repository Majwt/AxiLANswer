import { useCallback, useEffect, useState } from 'react';
import GraphView from './components/GraphView'
import brand from "./config/brand";
import type { GraphData, NodeDetails } from './types/graph';
import { fetchGraph } from './api/graphApi';
import NodeDetailsPanel from './components/NodeDetailsPane';
import AppHeader from './components/AppHeader';
import Filters from './components/Filters';
import type { filter } from './types/filter';
import SearchBar from './components/SearchBar';

document.title = brand.name;

function App() {

  const [data, setData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeDetails | null>(null);
  const [filters, setFilters] = useState<filter[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleSelectNode = useCallback((_node: string, attrs: NodeDetails | null) => {
    setSelectedNode(attrs);
  }, []);

  // load graph on initial render
  useEffect(() => {
    async function loadGraph() {
      const graph = await fetchGraph();
      setData(graph);
    }
    loadGraph();
  }, []);
  // auto fetch graph every 5 minutes
  useEffect(() => {


  }, []);

  

  return (
    <main className="app">
      <section className="app-content">
        <div className="graphview-shell">
          {data ? <GraphView data={data} filters={filters} onSelectNode={handleSelectNode} searchQuery={searchQuery} /> : <p className="graphview-loading">Loading graph...</p>}
        </div>
        <div className="graphview-overlay">
          <AppHeader />
          <NodeDetailsPanel node={selectedNode} />
          <div className="filter-container">
            <SearchBar query={searchQuery} setQuery={setSearchQuery} />
            <Filters filters={filters} setFilters={setFilters} />
          </div>
          <span className="version-info">{"v0.0.0"}</span>
          <span className="last-fetch-info">{"Updated at 15:00"}</span>
        </div>
      </section>
    </main>
  )
}

export default App
