// Oyuncu bakiye deposu — SQLite ile kalıcı.
// Bakiye, oyuncunun /pay ArcheryTrade ile gönderdiği oyun parasıdır.

import { db } from "./db.js";
import { getBot } from "./bot.js";

export interface Player {
  username: string;
  balance: number;
  createdAt: number;
}

function key(username: string) {
  return username.toLowerCase();
}

const selStmt = db.prepare(
  "SELECT display AS username, balance, created_at AS createdAt FROM players WHERE username = ?"
);
const insStmt = db.prepare(
  "INSERT INTO players (username, display, balance, created_at) VALUES (?, ?, 0, ?)"
);
const balStmt = db.prepare("UPDATE players SET balance = ? WHERE username = ?");
const ledgerStmt = db.prepare(
  "INSERT INTO ledger (username, delta, reason, created_at) VALUES (?, ?, ?, ?)"
);

export function getOrCreatePlayer(username: string): Player {
  const k = key(username);
  let row = selStmt.get(k) as Player | undefined;
  if (!row) {
    insStmt.run(k, username, Date.now());
    row = selStmt.get(k) as Player;
  }
  return row;
}

export function getPlayer(username: string): Player | undefined {
  return selStmt.get(key(username)) as Player | undefined;
}

export function deposit(username: string, amount: number, reason = "deposit"): Player {
  const p = getOrCreatePlayer(username);
  const next = p.balance + Math.floor(amount);
  balStmt.run(next, key(username));
  ledgerStmt.run(key(username), Math.floor(amount), reason, Date.now());
  console.log(`[store] ${username} +${amount} (${reason}) -> ${next}`);
  return getPlayer(username)!;
}

/** Bakiyeden düşer. Yetersizse false döner, değişiklik yapmaz. */
export function withdraw(username: string, amount: number, reason = "withdraw"): boolean {
  const p = getOrCreatePlayer(username);
  if (p.balance < amount) return false;
  const next = p.balance - Math.floor(amount);
  balStmt.run(next, key(username));
  ledgerStmt.run(key(username), -Math.floor(amount), reason, Date.now());
  return true;
}

// Bot gerçek ödeme algıladığında bakiyeye ekle
getBot().on("payment", (username: string, amount: number) => {
  deposit(username, amount, "oyundan-yatırma");
  getBot().whisper(username, `${amount} bakiyene eklendi. Iyi oyunlar!`);
});

// Çekim başarısız olursa (bot parası yetersiz) iade et
getBot().on("withdrawFailed", (username: string, amount: number) => {
  deposit(username, amount, "çekim-iade");
  console.log(`[store] çekim iadesi: ${username} +${amount}`);
});
