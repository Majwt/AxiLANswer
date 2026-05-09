import "./AppHeader.css";
import brand from "../config/brand";

export default function AppHeader() {
  return (
    <>
      <header className="app-header">
        <div className="brand-logo">
          <h1 className="logo" aria-label={brand.name}>
              <span className="axi">Axi</span><span className="lan">LAN</span><span className="swer">swer</span>
          </h1>
          <span className="version-info">

            {import.meta.env.PROD ? (
              <>
                v{import.meta.env.VITE_APP_VERSION}
              </>
            ) : (
              <>
                v{new Date().toISOString()} (dev)
              </>

            )}
          </span>

        </div>
      </header>
    </>
  );
}
