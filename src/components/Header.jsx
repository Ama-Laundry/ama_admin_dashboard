import amaLogo from "../assets/ama_logo.png";

export default function Header() {
  return (
    <header className="header">
      <div className="header-logo-container">
        <img src={amaLogo} alt="AMA Logo" className="header-logo" />
      </div>
      <h1 className="header-title">Admin Dashboard</h1>
      <p className="header-subtitle">Manage laundry booking services.</p>
      <div className="brand-stripe" />
    </header>
  );
}
