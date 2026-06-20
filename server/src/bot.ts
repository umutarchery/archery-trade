// ArcheryTrade Mineflayer botu — oyna.chickennw.com köprüsü.
// Çalışan referans bota göre uyarlandı:
//  - Sunucu proxy/lobi: bağlanınca /server smpspawn ile SMP'ye geçilir.
//  - Giriş kodu formatı: oyuncu /msg yazınca chat'e "oyuncu -> Sen: A7K9P2" düşer.
//  - Para yatırma: "oyuncu oyuncusundan 1000$ aldınız!"
//  - Çıkış ödemesi: /pay; başarı/başarısızlık chat'ten izlenir, hata olursa iade.

import { EventEmitter } from "node:events";
import { createBot, type Bot } from "mineflayer";
import { config, patterns } from "./config.js";

interface PendingWithdrawal {
  username: string;
  amount: number;
  cmd: string;
}

type QueueItem = { cmd: string } | (PendingWithdrawal & { type: "withdraw" });

class ArcheryBot extends EventEmitter {
  private bot: Bot | null = null;
  private ready = false;
  private outOfMoney = false;
  private switchedServer = false;

  private queue: QueueItem[] = [];
  private processing = false;
  private pendingWithdrawal: PendingWithdrawal | null = null;

  get online() {
    return this.ready;
  }
  get username() {
    return config.mc.username;
  }
  get isOutOfMoney() {
    return this.outOfMoney;
  }
  setOutOfMoney(v: boolean) {
    this.outOfMoney = v;
  }

  connect() {
    console.log(
      `[bot] ${config.mc.host}:${config.mc.port} bağlanılıyor (sürüm ${config.mc.version})...`
    );
    this.switchedServer = false;
    const bot = createBot({
      host: config.mc.host,
      port: config.mc.port,
      username: config.mc.username,
      auth: config.mc.auth,
      version: config.mc.version,
    });
    this.bot = bot;

    bot.on("login", () => console.log(`[bot] giriş yapıldı: ${bot.username}`));

    bot.on("spawn", () => {
      console.log("[bot] dünyaya girildi (spawn). SMP'ye geçiliyor...");
      this.markReady();
      // Lobide kalma: spawn sonrası SMP sunucusuna geç (koşulsuz, tek sefer).
      this.switchToSmp();
    });

    bot.on("message", (jsonMsg) => this.onMessage(jsonMsg.toString()));

    bot.on("kicked", (reason) => {
      this.ready = false;
      console.warn("[bot] atıldı:", JSON.stringify(reason));
    });
    bot.on("error", (err) => console.error("[bot] hata:", err.message));
    bot.on("end", (reason) => {
      this.ready = false;
      console.warn(`[bot] bağlantı koptu (${reason}). 10sn sonra tekrar denenecek.`);
      this.bot = null;
      setTimeout(() => this.connect(), 10000);
    });
  }

  private markReady() {
    if (this.ready) return;
    this.ready = true;
    console.log("[bot] hazır — komutlar dinleniyor.");
    this.emit("ready");
  }

  /** Lobiden SMP sunucusuna geç (tek sefer, kısa gecikmeyle). */
  private switchToSmp() {
    if (this.switchedServer) return;
    this.switchedServer = true;
    setTimeout(() => {
      if (this.bot) {
        console.log(`[bot] komut: ${config.mc.serverSwitchCommand}`);
        this.bot.chat(config.mc.serverSwitchCommand);
      }
    }, 3000);
  }

  private onMessage(raw: string) {
    console.log("[CHAT]", raw);

    // 1) Otomatik giriş (AuthMe): sunucu /gir veya /login isterse
    if (patterns.authPrompt.test(raw)) {
      const pass = config.mc.password;
      if (!pass) {
        console.warn("[bot] MC_PASSWORD boş! .env'e şifre ekle.");
      } else {
        const cmd = config.mc.loginCommand.replace(/\{pass\}/g, pass);
        setTimeout(() => this.bot?.chat(cmd), 1000);
      }
    }

    // 1b) Giriş başarılı -> SMP sunucusuna geç (yedek tetik)
    if (/başarıyla giriş/i.test(raw)) {
      this.switchToSmp();
    }

    // 2) Para yatırma: "oyuncu oyuncusundan 1000$ aldınız!"
    const pay = raw.match(patterns.paymentReceived);
    if (pay) {
      this.outOfMoney = false; // bota para geldi
      const sender = pay[1];
      const amount = parseInt(pay[2].replace(/[,.]/g, ""), 10);
      if (sender && sender !== config.mc.username && Number.isFinite(amount) && amount > 0) {
        console.log(`[bot] ödeme algılandı: ${sender} -> ${amount}`);
        this.emit("payment", sender, amount);
      }
    }

    // 3) Giriş kodu: "oyuncu -> Sen: A7K9P2"
    const login = raw.match(patterns.loginCode);
    if (login) {
      const sender = login[1];
      const code = login[2].toUpperCase();
      console.log(`[bot] giriş kodu: ${sender} -> ${code}`);
      this.emit("code", sender, code);
    }

    // 4) Giden ödeme sonucu (çekim takibi)
    if (this.pendingWithdrawal) {
      if (patterns.payFail.test(raw)) {
        console.warn(`[bot] ödeme başarısız: ${raw} — iade ediliyor`);
        this.outOfMoney = true;
        this.emit("withdrawFailed", this.pendingWithdrawal.username, this.pendingWithdrawal.amount);
        this.pendingWithdrawal = null;
      } else if (patterns.paySuccess.test(raw)) {
        console.log(`[bot] ödeme başarılı: ${raw}`);
        this.emit("withdrawOk", this.pendingWithdrawal.username, this.pendingWithdrawal.amount);
        this.pendingWithdrawal = null;
      }
    }
  }

  // ---------- Komut kuyruğu (5sn aralıklı, spam koruması) ----------
  private enqueue(item: QueueItem) {
    this.queue.push(item);
    this.processQueue();
  }

  private processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    const item = this.queue.shift()!;

    if (this.bot && this.ready) {
      if ("type" in item && item.type === "withdraw") {
        this.pendingWithdrawal = item;
        console.log(`[bot] komut (çekim): ${item.cmd}`);
        this.bot.chat(item.cmd);
      } else {
        console.log(`[bot] komut: ${item.cmd}`);
        this.bot.chat(item.cmd);
      }
    }

    setTimeout(() => {
      this.pendingWithdrawal = null; // takılı kalmasın
      this.processing = false;
      this.processQueue();
    }, config.commandDelayMs);
  }

  /**
   * Oyuncuya ödeme yapar (çekim). Dönüş: kuyruğa alındı mı.
   * Sonuç (başarı/iade) 'withdrawOk' / 'withdrawFailed' olaylarıyla bildirilir.
   */
  pay(username: string, amount: number): "queued" | "out_of_money" | "offline" {
    if (this.outOfMoney) return "out_of_money";
    if (!this.bot || !this.ready) return "offline";
    const cmd = config.payCommand
      .replace("{player}", username)
      .replace("{amount}", String(Math.floor(amount)));
    this.enqueue({ type: "withdraw", username, amount: Math.floor(amount), cmd });
    return "queued";
  }

  /** Oyuncuya bilgi mesajı (whisper). */
  whisper(username: string, message: string) {
    if (!this.bot || !this.ready) return;
    this.enqueue({ cmd: `/msg ${username} ${message}` });
  }
}

let instance: ArcheryBot | null = null;

export function getBot(): ArcheryBot {
  if (!instance) {
    instance = new ArcheryBot();
    instance.connect();
  }
  return instance;
}
