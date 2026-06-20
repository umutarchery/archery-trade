// ArcheryTrade backend API istemcisi.

// Geliştirmede localhost:8787; üretimde aynı origin altında nginx /api'yi
// backend'e proxy'ler, bu yüzden VITE_API_URL boş (relative) bırakılır.
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8787";
const TOKEN_KEY = "archerytrade_token";

export interface Player {
  username: string;
  balance: number;
  createdAt: number;
}

export interface RoomPlayer {
  username: string;
  karpuz: number | null;
}

export interface Room {
  id: string;
  host: string;
  bet: number;
  status: "waiting" | "finished";
  players: RoomPlayer[];
  pot: number;
  winner?: string;
  winningKarpuz?: number;
  commission?: number;
  payout?: number;
  createdAt: number;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "İstek başarısız.");
  return data as T;
}

export const api = {
  health: () =>
    req<{ ok: boolean; bot: { online: boolean; username: string }; server: string; commission: number }>(
      "/api/health"
    ),

  requestCode: (username: string) =>
    req<{ code: string; expiresInSec: number; botName: string; instruction: string }>(
      "/api/auth/request",
      { method: "POST", body: JSON.stringify({ username }) }
    ),

  authStatus: (code: string) =>
    req<{ verified: boolean; token?: string; player?: Player }>(
      `/api/auth/status?code=${encodeURIComponent(code)}`
    ),

  me: () => req<{ player: Player }>("/api/me"),

  cashout: (amount: number) =>
    req<{ ok: boolean; player: Player }>("/api/cashout", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),

  listRooms: () => req<{ rooms: Room[] }>("/api/rooms"),
  getRoom: (id: string) => req<{ room: Room }>(`/api/rooms/${id}`),
  createRoom: (bet: number) =>
    req<{ room: Room }>("/api/rooms", {
      method: "POST",
      body: JSON.stringify({ bet }),
    }),
  joinRoom: (id: string) =>
    req<{ room: Room }>(`/api/rooms/${id}/join`, { method: "POST" }),
  cancelRoom: (id: string) =>
    req<{ ok: boolean }>(`/api/rooms/${id}/cancel`, { method: "POST" }),
};
