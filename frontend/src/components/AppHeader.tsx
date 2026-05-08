import "./AppHeader.css";

import logo from "@branding/logo.svg";
import brand from "../config/brand";

export default function AppHeader() {
  return (
    <>
      <header className="app-header">
        <div className="brand-logo">
          <img src={logo} height={35} alt={`${brand.name} Logo`}  />
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
