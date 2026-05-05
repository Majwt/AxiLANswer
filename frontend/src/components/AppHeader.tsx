import "./AppHeader.css";
import brand from "../config/brand";
import Logo from "../config/logo";

export default function AppHeader() {
  return (
    <>
      <header className="app-header">
        <div className="brand-logo">
          <Logo />
        </div>
        <h1 className="app-name">{brand.NameWithLogo}</h1>
      </header>
    </>
  );
}
