import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [searchSelection, setSearchSelection] = useState<string>("");
  const [searchSelectionVersion, setSearchSelectionVersion] = useState(0);
  const searchSuggestions = useMemo(() => {
    if (!data) return [];

    const nodeNames = new Set<string>();

    for (const node of data.nodes) nodeNames.add(node.fqdn);
    for (const edge of data.edges) {
      nodeNames.add(edge.source_fqdn);
      nodeNames.add(edge.target_fqdn);
    }

    return [...nodeNames].sort((a, b) => a.localeCompare(b));
  }, [data]);

  const handleSelectNode = useCallback((_node: string, attrs: NodeDetails | null) => {
    setSelectedNode(attrs);
  }, []);

  const handleSearchSubmit = useCallback((query: string) => {
    if (!query) return;
    setSearchSelection(query);
    setSearchSelectionVersion((version) => version + 1);
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
          {data ? <GraphView data={data} filters={filters} onSelectNode={handleSelectNode} searchQuery={searchQuery} searchSelection={searchSelection} searchSelectionVersion={searchSelectionVersion} /> : <p className="graphview-loading">Loading graph...</p>}
        </div>
        <div className="graphview-overlay">
          <AppHeader />
          <NodeDetailsPanel node={selectedNode} filters={filters} searchQuery={searchQuery} />
          <div className="filter-container">
            <SearchBar query={searchQuery} setQuery={setSearchQuery} suggestions={searchSuggestions} onSubmit={handleSearchSubmit} />
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
