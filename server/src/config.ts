import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 8787),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  mc: {
    host: process.env.MC_HOST ?? "oyna.chickennw.com",
    port: Number(process.env.MC_PORT ?? 25565),
    username: process.env.MC_USERNAME ?? "ArcheryTrade",
    auth: (process.env.MC_AUTH ?? "offline") as "offline" | "microsoft",
    // Çalışan örnek 1.20.4 kullanıyor (sunucu 1.20 altını kabul etmiyor).
    version: process.env.MC_VERSION || "1.20.4",
    /** AuthMe şifresi (offline sunucu). */
    password: process.env.MC_PASSWORD ?? "",
    /** Giriş komutu. */
    loginCommand: process.env.MC_LOGIN_CMD ?? "/login {pass}",
    /** Bağlanınca SMP sunucusuna geçiş komutu (proxy/lobi ağı). */
    serverSwitchCommand: process.env.MC_SERVER_CMD ?? "/server smpspawn",
  },
  /** Kazanana/çekene ödeme komutu. */
  payCommand: process.env.PAY_COMMAND ?? "/pay {player} {amount}",
  /** Komutlar arası bekleme (ms) — spam koruması. */
  commandDelayMs: Number(process.env.COMMAND_DELAY_MS ?? 5000),
  /** Karpuz odası komisyonu. */
  commission: Number(process.env.COMMISSION ?? 0.05), // %5
};

/**
 * Sunucunun ürettiği mesaj kalıpları (çalışan bottan birebir alındı).
 * Sunucu eklentisi değişirse burayı güncelle.
 */
export const patterns = {
  /** "xBerkxq oyuncusundan 1000$ aldınız!" -> [_, gönderen, miktar] */
  paymentReceived: /([a-zA-Z0-9_]{3,16})\s+oyuncusundan\s+([0-9,.]+)\$\s+aldınız!/i,
  /** "xBerkxq -> Sen: A7K9P2" -> [_, gönderen, kod]  (oyuncunun /msg'i) */
  loginCode: /([a-zA-Z0-9_]{3,16})\s+->\s+Sen:\s+([a-zA-Z0-9]{6})/i,
  /** Bota giriş istendiğini gösteren kalıp. */
  authPrompt: /\/gir|\/login/i,
  /** Giden ödeme başarılı. */
  paySuccess: /başarıyla|gönderildi|ödediniz/i,
  /** Giden ödeme başarısız. */
  payFail: /yetersiz bakiye|yeterli paran yok|yeterli bakiyeniz yok|bulunamadı|aktif değil/i,
};
