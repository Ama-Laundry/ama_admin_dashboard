const links = [
  { id: "dashboard", label: "Dashboard" },
  { id: "orders", label: "Orders" },
  { id: "camps", label: "Camps" },
  { id: "statistics", label: "Statistics" },
  { id: "control", label: "Control Panel" },
  { id: "account", label: "Account" },
];

export default function NavBar({ activeTab, setActiveTab }) {
  return (
    <nav className="nav-bar">
      <ul className="nav-links">
        {links.map((link) => (
          <li key={link.id}>
            <button
              onClick={() => setActiveTab(link.id)}
              className={`nav-link ${activeTab === link.id ? "active" : ""}`}
            >
              {link.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="nav-search">
        <input type="text" placeholder="Search..." />
      </div>
    </nav>
  );
}
