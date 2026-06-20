import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

export default function WalletPage() {
  const { player, refresh } = useAuth();
  const [amount, setAmount] = useState(100);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!player) {
    return (
      <div>
        <h1>💰 Cüzdan</h1>
        <p className="muted">Cüzdanını görmek için giriş yap.</p>
      </div>
    );
  }

  async function cashout() {
    setError("");
    setMsg("");
    setBusy(true);
    try {
      await api.cashout(amount);
      await refresh();
      setMsg(`${amount} oyuna geri gönderildi. Oyun içi bakiyene düştü.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1>💰 Cüzdan</h1>

      <div className="card section">
        <div className="balance-bar">
          <div className="bal">
            {player.username} · Bakiye: <b>{player.balance.toLocaleString("tr-TR")} 💰</b>
          </div>
        </div>
        <p className="muted">
          Bakiyeni artırmak için oyunda bota para gönder:
        </p>
        <div className="code-box">/pay ArcheryTrade &lt;miktar&gt;</div>
        <p className="muted" style={{ marginTop: 8 }}>
          Bot ödemeyi algılayınca bakiyene otomatik eklenir.
        </p>
      </div>

      <div className="card section">
        <h2>Bakiyeyi Oyuna Çek</h2>
        <p className="muted">
          Bakiyeni oyun içi paraya geri çevir. Bot sana <b>/pay</b> ile gönderir.
        </p>
        <div className="bet-controls" style={{ marginTop: 10 }}>
          <input
            type="number"
            min={1}
            max={player.balance}
            value={amount}
            onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
          />
          <button className="btn" disabled={busy || amount > player.balance} onClick={cashout}>
            {busy ? "..." : "Çek"}
          </button>
        </div>
        {amount > player.balance && (
          <p style={{ color: "var(--danger)", marginTop: 8 }}>Yetersiz bakiye.</p>
        )}
        {error && <p style={{ color: "var(--danger)", marginTop: 8 }}>{error}</p>}
        {msg && <div className="result win" style={{ marginTop: 12 }}>{msg}</div>}
      </div>
    </div>
  );
}
