import "./SearchBar.css";


function SearchBar({ query, setQuery }: { query: string; setQuery: (query: string) => void }) {


  return (
    <div className="search-bar">
      <input
        className="search-input"
        type="text"
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </div>
  );
}
export default SearchBar;
