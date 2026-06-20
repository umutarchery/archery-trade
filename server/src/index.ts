import express from "express";
import cors from "cors";
import { z } from "zod";
import { config } from "./config.js";
import { getBot } from "./bot.js";
import { requestCode, checkStatus, sessionFromToken } from "./auth.js";
import { getOrCreatePlayer, getPlayer, withdraw } from "./store.js";
import {
  createRoom,
  joinRoom,
  cancelRoom,
  listRooms,
  getRoom,
} from "./rooms.js";

const app = express();
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());

// Botu başlat (sunucuya bağlanır)
getBot();

function auth(req: express.Request) {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : undefined;
  return sessionFromToken(token);
}

function requireAuth(
  req: express.Request,
  res: express.Response
): { username: string } | null {
  const session = auth(req);
  if (!session) {
    res.status(401).json({ error: "Giriş gerekli." });
    return null;
  }
  return session;
}

// ---------- Genel ----------
app.get("/api/health", (_req, res) => {
  const bot = getBot();
  res.json({
    ok: true,
    bot: { online: bot.online, username: bot.username },
    server: config.mc.host,
    commission: config.commission,
  });
});

// ---------- Auth (kod sitede çıkar, oyuncu oyunda yazar) ----------
const usernameSchema = z.string().min(3).max(16).regex(/^[A-Za-z0-9_]+$/);

app.post("/api/auth/request", (req, res) => {
  const parsed = usernameSchema.safeParse(req.body?.username);
  if (!parsed.success) return res.status(400).json({ error: "Geçersiz kullanıcı adı." });
  const { code, expiresInSec } = requestCode(parsed.data);
  res.json({
    code,
    expiresInSec,
    botName: config.mc.username,
    instruction: `Oyunda: /msg ${config.mc.username} ${code}`,
  });
});

// Site bunu yoklar; oyuncu oyunda kodu yazınca verified=true döner
app.get("/api/auth/status", (req, res) => {
  const code = String(req.query.code ?? "");
  const result = checkStatus(code);
  if (result.verified && result.token) {
    const session = sessionFromToken(result.token)!;
    return res.json({ verified: true, token: result.token, player: getPlayer(session.username) });
  }
  res.json({ verified: false });
});

app.get("/api/me", (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  res.json({ player: getOrCreatePlayer(session.username) });
});

// ---------- Çekme (bakiyeyi oyuna geri gönder) ----------
const cashoutSchema = z.object({ amount: z.number().int().positive() });

app.post("/api/cashout", (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const parsed = cashoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Geçersiz tutar." });

  const bot = getBot();
  if (!bot.online) return res.status(503).json({ error: "Bot şu an çevrimdışı." });
  if (bot.isOutOfMoney)
    return res.status(503).json({ error: "Bot bakiyesi yetersiz, sonra tekrar dene." });

  const player = getPlayer(session.username);
  if (!player || player.balance < parsed.data.amount) {
    return res.status(400).json({ error: "Yetersiz bakiye." });
  }

  // Bakiyeyi hemen düş; ödeme başarısız olursa bot 'withdrawFailed' ile iade eder.
  withdraw(session.username, parsed.data.amount);
  const result = bot.pay(session.username, parsed.data.amount);
  if (result !== "queued") {
    getOrCreatePlayer(session.username).balance += parsed.data.amount; // anında geri al
    const msg = result === "out_of_money" ? "Bot bakiyesi yetersiz." : "Bot çevrimdışı.";
    return res.status(503).json({ error: msg });
  }
  // Kuyruğa alındı; oyuncuya bot oyun içinde ödeyecek.
  res.json({ ok: true, queued: true, player: getPlayer(session.username) });
});

// ---------- Karpuz odaları ----------
app.get("/api/rooms", (_req, res) => {
  res.json({ rooms: listRooms() });
});

app.get("/api/rooms/:id", (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: "Oda yok." });
  res.json({ room });
});

const createSchema = z.object({
  bet: z.number().int().positive(),
});

app.post("/api/rooms", (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Geçersiz oda ayarı." });
  const result = createRoom(session.username, parsed.data.bet);
  if ("error" in result) return res.status(400).json(result);
  res.json({ room: result });
});

app.post("/api/rooms/:id/join", (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const result = joinRoom(req.params.id, session.username);
  if ("error" in result) return res.status(400).json(result);
  res.json({ room: result });
});

app.post("/api/rooms/:id/cancel", (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const result = cancelRoom(req.params.id, session.username);
  if ("error" in result) return res.status(400).json(result);
  res.json(result);
});

app.listen(config.port, () => {
  console.log(`🏹 ArcheryTrade API -> http://localhost:${config.port}`);
  console.log(`   Sunucu: ${config.mc.host} | Bot: ${config.mc.username} | Komisyon: %${config.commission * 100}`);
});
