import { useEffect, useState, useCallback } from "react";
import { api, type Room } from "../api";
import { useAuth } from "../auth";

const KARPUZ = "🍉";

function RoomCard({
  room,
  meName,
  onJoin,
  onCancel,
}: {
  room: Room;
  meName?: string;
  onJoin: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const mine = room.players.some((p) => p.username.toLowerCase() === meName?.toLowerCase());
  const isHost = room.host.toLowerCase() === meName?.toLowerCase();
  const finished = room.status === "finished";

  return (
    <div className="card room">
      <div className="room-head">
        <span className="room-id">Oda #{room.id}</span>
        <span className={`room-status ${room.status}`}>
          {finished ? "Bitti" : "Rakip bekliyor"}
        </span>
      </div>
      <div className="room-meta">
        <span>Bahis: <b>{room.bet} 💰</b></span>
        <span>Pot: <b style={{ color: "var(--gold)" }}>{room.pot} 💰</b></span>
      </div>

      <div className="room-players">
        {room.players.map((p) => (
          <div key={p.username} className={`rp ${room.winner === p.username ? "win" : ""}`}>
            <span>
              {p.username}
              {p.username === room.host ? " 👑" : ""}
              {room.winner === p.username ? " 🏆" : ""}
            </span>
            <span className="karpuz">
              {finished && p.karpuz != null ? `${KARPUZ} ${p.karpuz}` : "🍉 ?"}
            </span>
          </div>
        ))}
        {!finished && room.players.length < 2 && (
          <div className="rp empty">
            <span className="muted">boş yer</span>
            <span className="muted">🍉 ?</span>
          </div>
        )}
      </div>

      {finished ? (
        <div className="room-result">
          🏆 <b>{room.winner}</b> kazandı! Karpuz {room.winningKarpuz} ·
          ödül {room.payout} 💰 (komisyon {room.commission})
        </div>
      ) : (
        <div className="room-actions">
          {!mine && (
            <button className="btn" onClick={() => onJoin(room.id)}>
              Katıl &amp; Oyna ({room.bet} 💰)
            </button>
          )}
          {isHost && (
            <button className="btn ghost" onClick={() => onCancel(room.id)}>
              İptal (iade)
            </button>
          )}
          {mine && !isHost && <span className="muted">Sıra sende, karpuz çekiliyor...</span>}
        </div>
      )}
    </div>
  );
}

export default function RoomsPage({ onNeedLogin }: { onNeedLogin: () => void }) {
  const { player, refresh } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bet, setBet] = useState(100);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { rooms } = await api.listRooms();
      setRooms(rooms);
    } catch {
      /* yoksay */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 2000); // odaları canlı tut
    return () => clearInterval(t);
  }, [load]);

  async function guard(fn: () => Promise<void>) {
    if (!player) return onNeedLogin();
    setError("");
    setBusy(true);
    try {
      await fn();
      await load();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const waiting = rooms.filter((r) => r.status === "waiting");
  const finished = rooms.filter((r) => r.status === "finished");

  return (
    <div>
      <h1>🍉 Karpuz Düellosu (1v1)</h1>
      <p className="muted">
        Oda aç, rakip beklesin. Biri katılınca ikinize de karpuz çıkar, yüksek
        olan potu kazanır. Kasa %5 komisyon alır. Bahisler eşittir.
      </p>

      <div className="card section">
        <h2>Oda Aç</h2>
        {!player && <p className="muted">Oda açmak için önce giriş yap.</p>}
        <div className="bet-controls" style={{ marginTop: 8 }}>
          <span className="muted">Bahis:</span>
          <input
            type="number"
            min={1}
            value={bet}
            onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
          />
          <button
            className="btn"
            disabled={busy}
            onClick={() => guard(() => api.createRoom(bet).then(() => {}))}
          >
            Oda Aç
          </button>
        </div>
        {error && <p style={{ color: "var(--danger)", marginTop: 10 }}>{error}</p>}
      </div>

      <div className="section">
        <h2>Açık Odalar</h2>
        {waiting.length === 0 && <p className="muted">Açık oda yok. İlk odayı sen aç!</p>}
        <div className="rooms-grid">
          {waiting.map((r) => (
            <RoomCard
              key={r.id}
              room={r}
              meName={player?.username}
              onJoin={(id) => guard(() => api.joinRoom(id).then(() => {}))}
              onCancel={(id) => guard(() => api.cancelRoom(id).then(() => {}))}
            />
          ))}
        </div>
      </div>

      {finished.length > 0 && (
        <div className="section">
          <h2>Son Sonuçlar</h2>
          <div className="rooms-grid">
            {finished.map((r) => (
              <RoomCard key={r.id} room={r} meName={player?.username} onJoin={() => {}} onCancel={() => {}} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
