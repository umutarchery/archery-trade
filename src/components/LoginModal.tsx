import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

type Step = "form" | "code";

export default function LoginModal({ onClose }: { onClose: () => void }) {
  const { login } = useAuth();
  const [step, setStep] = useState<Step>("form");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [botName, setBotName] = useState("ArcheryTrade");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const poll = useRef<number | null>(null);
  const tick = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (poll.current) clearInterval(poll.current);
      if (tick.current) clearInterval(tick.current);
    };
  }, []);

  async function requestCode() {
    setError("");
    setBusy(true);
    try {
      const res = await api.requestCode(username.trim());
      setCode(res.code);
      setBotName(res.botName);
      setSeconds(res.expiresInSec);
      setStep("code");
      startPolling(res.code);
      startCountdown();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function startCountdown() {
    if (tick.current) clearInterval(tick.current);
    tick.current = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          if (tick.current) clearInterval(tick.current);
          if (poll.current) clearInterval(poll.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function startPolling(theCode: string) {
    if (poll.current) clearInterval(poll.current);
    poll.current = window.setInterval(async () => {
      try {
        const res = await api.authStatus(theCode);
        if (res.verified && res.token && res.player) {
          if (poll.current) clearInterval(poll.current);
          if (tick.current) clearInterval(tick.current);
          login(res.token, res.player);
          onClose();
        }
      } catch {
        /* yoklamaya devam */
      }
    }, 2000);
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose}>
          ✕
        </button>

        {step === "form" && (
          <>
            <h2>🏹 Giriş Yap</h2>
            <p className="muted">
              Minecraft kullanıcı adını gir. Sana bir kod vereceğiz, onu oyun
              içinde bota yazınca girişin tamamlanır.
            </p>
            <div className="bet-controls" style={{ marginTop: 16 }}>
              <input
                style={{ width: 220 }}
                placeholder="Minecraft kullanıcı adın"
                value={username}
                maxLength={16}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && username.length >= 3 && requestCode()}
              />
            </div>
            {error && <p style={{ color: "var(--danger)", marginTop: 10 }}>{error}</p>}
            <div className="spin-row">
              <button className="btn" onClick={requestCode} disabled={busy || username.trim().length < 3}>
                {busy ? "..." : "Kod Al"}
              </button>
            </div>
          </>
        )}

        {step === "code" && (
          <>
            <h2>Kodunu Oyunda Yaz</h2>
            <p className="muted">Minecraft'ta sohbete şunu yaz:</p>
            <div className="code-box">
              /msg {botName} <b>{code}</b>
            </div>
            <p className="muted" style={{ marginTop: 12 }}>
              Yazdığın anda otomatik giriş yapılır. Süre: <b>{mm}:{ss}</b>
            </p>
            <div className="loader-dots">
              <span></span><span></span><span></span> oyun içi onay bekleniyor
            </div>
            {seconds === 0 && (
              <div className="spin-row">
                <button className="btn ghost" onClick={() => setStep("form")}>
                  Süre doldu — yeni kod al
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
