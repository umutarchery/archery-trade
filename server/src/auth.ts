// Hesap doğrulama — GERÇEK akış:
//  1) Oyuncu sitede MC adını girer -> /auth/request
//     Site 6 haneli bir KOD üretir ve ekranda gösterir.
//  2) Oyuncu oyunda: /msg ArcheryTrade <kod>
//     Bot 'code' olayı yayar; biz bekleyen kodla eşleştiririz.
//     Eşleşirse o hesabın sahibi olduğu kanıtlanır (oyunda o isimle online).
//  3) Site /auth/status ile durumu yoklar; doğrulanınca token alır.

import crypto from "node:crypto";
import { getBot } from "./bot.js";
import { getOrCreatePlayer } from "./store.js";

interface Pending {
  username: string;
  code: string;
  expiresAt: number;
  verified: boolean;
  token?: string;
}

interface Session {
  username: string;
  token: string;
  createdAt: number;
}

const CODE_TTL = 5 * 60 * 1000; // 5 dk

// key: code (kod benzersiz olduğu için kodla indexliyoruz)
const pendingByCode = new Map<string, Pending>();
// key: lowercase username -> aktif bekleyen kod
const pendingByUser = new Map<string, string>();
const sessions = new Map<string, Session>();

function uname(u: string) {
  return u.toLowerCase();
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // karışan harf/rakam yok
function genCode() {
  let code: string;
  do {
    code = Array.from({ length: 6 }, () =>
      CODE_CHARS[crypto.randomInt(0, CODE_CHARS.length)]
    ).join("");
  } while (pendingByCode.has(code));
  return code;
}

function cleanup() {
  const now = Date.now();
  for (const [code, p] of pendingByCode) {
    if (now > p.expiresAt && !p.verified) {
      pendingByCode.delete(code);
      pendingByUser.delete(uname(p.username));
    }
  }
}

// Bot bir kod yakaladığında doğrula
getBot().on("code", (username: string, code: string) => {
  cleanup();
  const pending = pendingByCode.get(code.toUpperCase());
  if (!pending) return; // bilinmeyen kod
  if (Date.now() > pending.expiresAt) return;
  // Aynı isim mi doğruladı? (büyük/küçük harf duyarsız)
  if (uname(pending.username) !== uname(username)) {
    getBot().whisper(username, "Bu kod sana ait değil.");
    return;
  }
  pending.verified = true;
  pending.token = crypto.randomBytes(24).toString("hex");
  sessions.set(pending.token, {
    username: pending.username,
    token: pending.token,
    createdAt: Date.now(),
  });
  getOrCreatePlayer(pending.username);
  getBot().whisper(username, "Giriş başarılı! Siteye dönebilirsin.");
  console.log(`[auth] ${username} doğrulandı.`);
});

export function requestCode(username: string): { code: string; expiresInSec: number } {
  cleanup();
  // Önceki bekleyen kodu iptal et
  const prev = pendingByUser.get(uname(username));
  if (prev) pendingByCode.delete(prev);

  const code = genCode();
  pendingByCode.set(code, {
    username,
    code,
    expiresAt: Date.now() + CODE_TTL,
    verified: false,
  });
  pendingByUser.set(uname(username), code);
  return { code, expiresInSec: CODE_TTL / 1000 };
}

export function checkStatus(code: string): { verified: boolean; token?: string } {
  cleanup();
  const pending = pendingByCode.get(code.toUpperCase());
  if (!pending) return { verified: false };
  if (pending.verified && pending.token) {
    return { verified: true, token: pending.token };
  }
  return { verified: false };
}

export function sessionFromToken(token: string | undefined): Session | undefined {
  if (!token) return undefined;
  return sessions.get(token);
}
