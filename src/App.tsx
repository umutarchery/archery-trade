import { useState } from "react";
import { AuthProvider, useAuth } from "./auth";
import HomePage from "./pages/HomePage";
import RoomsPage from "./pages/RoomsPage";
import WalletPage from "./pages/WalletPage";
import LoginModal from "./components/LoginModal";

export type Page = "home" | "rooms" | "wallet";

const NAV: { id: Page; label: string }[] = [
  { id: "home", label: "🏠 Ana Sayfa" },
  { id: "rooms", label: "🍉 Odalar" },
  { id: "wallet", label: "💰 Cüzdan" },
];

function Shell() {
  const { player, logout, loading } = useAuth();
  const [page, setPage] = useState<Page>("home");
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="app">
      <nav className="nav">
        <div className="brand" onClick={() => setPage("home")} style={{ cursor: "pointer" }}>
          🏹 Archery<span>Trade</span>
        </div>
        {NAV.map((n) => (
          <button
            key={n.id}
            className={page === n.id ? "active" : ""}
            onClick={() => setPage(n.id)}
          >
            {n.label}
          </button>
        ))}
        {!loading &&
          (player ? (
            <div className="nav-user">
              <span className="nav-bal">
                {player.username} · <b>{player.balance.toLocaleString("tr-TR")} 💰</b>
              </span>
              <button onClick={logout}>Çıkış</button>
            </div>
          ) : (
            <button className="nav-login" onClick={() => setShowLogin(true)}>
              🏹 Giriş Yap
            </button>
          ))}
      </nav>

      {page === "home" && <HomePage go={setPage} />}
      {page === "rooms" && <RoomsPage onNeedLogin={() => setShowLogin(true)} />}
      {page === "wallet" && <WalletPage />}

      <footer className="footer">
        🏹 ArcheryTrade — oyna.chickennw.com karpuz odaları · Komisyon %5 ·
        Oyun içi para
      </footer>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
