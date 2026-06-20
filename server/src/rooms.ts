// Karpuz odaları — basit 1v1 (head-to-head) mantığı.
// Akış:
//  - Oyuncu oda açar: bahis koyar, bahsi pota kilitlenir.
//  - 2. oyuncu katılır: bahsi pota eklenir ve oda OTOMATİK başlar.
//  - İkisine de 1–100 karpuz çıkar; yüksek olan potu kazanır.
//  - Pottan %5 komisyon kesilir, kalan kazanana eklenir.
//  - Sonuç döner; oda kısa süre sonra (sonucu görsünler diye) silinir.

import crypto from "node:crypto";
import { config } from "./config.js";
import { getOrCreatePlayer, getPlayer, deposit, withdraw } from "./store.js";

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

const MAX_PLAYERS = 2; // 1v1
const FINISHED_TTL = 20_000; // bitmiş oda 20sn sonra silinir

const rooms = new Map<string, Room>();

function rng() {
  return crypto.randomInt(1, 101); // 1..100
}
function shortId() {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}
function sameUser(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

export function listRooms(): Room[] {
  return [...rooms.values()].sort((a, b) => b.createdAt - a.createdAt);
}
export function getRoom(id: string): Room | undefined {
  return rooms.get(id);
}

export function createRoom(host: string, bet: number): Room | { error: string } {
  if (!Number.isInteger(bet) || bet <= 0) return { error: "Geçersiz bahis." };

  const player = getOrCreatePlayer(host);
  if (player.balance < bet) return { error: "Yetersiz bakiye." };

  // Bir oyuncunun aynı anda tek bekleyen odası olsun
  for (const r of rooms.values()) {
    if (r.status === "waiting" && sameUser(r.host, host)) {
      return { error: "Zaten açık bir odan var." };
    }
  }

  withdraw(host, bet, "oda-bahis");
  const room: Room = {
    id: shortId(),
    host,
    bet,
    status: "waiting",
    players: [{ username: host, karpuz: null }],
    pot: bet,
    createdAt: Date.now(),
  };
  rooms.set(room.id, room);
  return room;
}

export function joinRoom(id: string, username: string): Room | { error: string } {
  const room = rooms.get(id);
  if (!room) return { error: "Oda bulunamadı." };
  if (room.status !== "waiting") return { error: "Oda başlamış." };
  if (room.players.some((p) => sameUser(p.username, username)))
    return { error: "Zaten bu odadasın." };
  if (room.players.length >= MAX_PLAYERS) return { error: "Oda dolu." };

  const player = getOrCreatePlayer(username);
  if (player.balance < room.bet) return { error: "Yetersiz bakiye." };

  withdraw(username, room.bet, "oda-bahis");
  room.players.push({ username, karpuz: null });
  room.pot += room.bet;

  // 2. oyuncu katıldı -> otomatik başlat
  settle(room);
  return room;
}

/** Odayı çözer: karpuz çek, kazananı belirle, ödülü dağıt. */
function settle(room: Room) {
  let best = -1;
  for (const p of room.players) {
    p.karpuz = rng();
    if (p.karpuz > best) best = p.karpuz;
  }
  // Beraberlik (aynı karpuz) -> aralarından rastgele kazanan
  const top = room.players.filter((p) => p.karpuz === best);
  const winner = top[crypto.randomInt(0, top.length)];

  const commission = Math.ceil(room.pot * config.commission);
  const payout = room.pot - commission;

  room.status = "finished";
  room.winner = winner.username;
  room.winningKarpuz = best;
  room.commission = commission;
  room.payout = payout;

  deposit(winner.username, payout, "oda-kazanç");
  console.log(
    `[oda ${room.id}] ${room.players.map((p) => `${p.username}:${p.karpuz}`).join(" vs ")} ` +
      `-> kazanan ${winner.username}, pot ${room.pot}, komisyon ${commission}, ödül ${payout}`
  );

  // Sonucu görsünler, sonra sil
  setTimeout(() => rooms.delete(room.id), FINISHED_TTL);
}

/** Bekleyen odayı iptal et (host bahsini geri alır). */
export function cancelRoom(id: string, requester: string): { ok: true } | { error: string } {
  const room = rooms.get(id);
  if (!room) return { error: "Oda bulunamadı." };
  if (room.status !== "waiting") return { error: "Oynanmış oda iptal edilemez." };
  if (!sameUser(room.host, requester)) return { error: "Sadece oda sahibi iptal edebilir." };
  // Tüm bahisleri iade et (sadece host var bu noktada)
  for (const p of room.players) deposit(p.username, room.bet, "oda-iptal-iade");
  rooms.delete(id);
  return { ok: true };
}

export { getPlayer };
