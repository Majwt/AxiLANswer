import "./SearchBar.css";


type Props = {
  query: string;
  setQuery: (query: string) => void;
  suggestions: string[];
  onSubmit: (query: string) => void;
};

function SearchBar({ query, setQuery, suggestions, onSubmit }: Props) {
  const suggestionsId = "node-search-suggestions";


  return (
    <div className="search-bar">
      <input
        className="search-input"
        type="text"
        placeholder="Search..."
        value={query}
        list={suggestionsId}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          onSubmit(query.trim());
        }}
      />
      {query ? (
        <button
          type="button"
          className="search-clear-button"
          aria-label="Clear search"
          onClick={() => setQuery("")}
        >
          ×
        </button>
      ) : null}
      <datalist id={suggestionsId}>
        {suggestions.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
    </div>
  );
}
export default SearchBar;
