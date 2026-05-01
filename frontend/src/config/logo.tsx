import logo from "@branding/logo_no_bg.svg";
import brand from "./brand";

export default function Logo() {
  return <img src={logo} height={50} alt={`${brand.name} Logo`} className="brand-logo" />
}

