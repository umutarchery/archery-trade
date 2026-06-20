# 🏹 ArcheryTrade — Karpuz Odaları

`oyna.chickennw.com` için karpuz oyunu sitesi. Oyuncular oyun parasını siteye
yatırır, karpuz odalarında yarışır, en yüksek karpuz potu kazanır. Kasa %5
komisyon alır. Para akışı, sunucuya bağlanan bir **Mineflayer botu** ile gerçek
oyun ekonomisine bağlıdır.

## Mimari

```
Tarayıcı (React + TS)  ⇄  API (Express + TS)  ⇄  Mineflayer Bot  ⇄  oyna.chickennw.com
     site                  bakiye + odalar         /msg, /pay         oyun ekonomisi
```

- **Giriş:** Site kod üretir → oyuncu oyunda `/msg ArcheryTrade <kod>` yazar →
  bot yakalar → hesap doğrulanır (o isimle online olduğu kanıtlanır).
- **Para yatırma:** Oyuncu oyunda `/pay ArcheryTrade <miktar>` → bot algılar →
  site bakiyesine eklenir.
- **Oyun:** Oyuncular odaya girer (bahisleri pota gider) → herkese 1–100 karpuz
  çıkar → en yüksek kazanır → pottan %5 komisyon kesilir, kalanı kazanana eklenir.
- **Çekme:** Oyuncu bakiyesini `/pay` ile oyuna geri çeker (bot öder).

RNG ve komisyon **yalnızca sunucuda** çalışır; istemciye güvenilmez.

## Kurulum

### 1) Botun oyun hesabını hazırla (ÖNEMLİ)

Sunucu offline + AuthMe (`/gir şifre`) kullanıyor. Bot dünyaya girebilmek için
bir kez kayıt olmalı:

1. Minecraft'ı offline/cracked başlat, kullanıcı adı **ArcheryTrade** ile gir.
2. Sunucuya bağlan, çıkan komutla kayıt ol: `/kayit <şifre> <şifre>`
   (eklenti farklıysa `/register ...` olabilir).
3. Bu şifreyi aşağıda `.env`'e yaz.

> Bot bu hesabın sahibi olmalı; ekonomi komutlarını (`/pay`) çalıştırabilmesi
> için yeterli izne/bakiyeye sahip olması gerekir.

### 2) Backend

```bash
cd server
cp .env.example .env     # zaten .env var; şifreyi gir
# .env içinde MC_PASSWORD=<botun şifresi>
npm install
npm run dev              # http://localhost:8787
```

`.env` önemli alanları:

| Değişken | Açıklama |
|----------|----------|
| `MC_HOST` | `oyna.chickennw.com` |
| `MC_VERSION` | `1.21.4` |
| `MC_USERNAME` | `ArcheryTrade` |
| `MC_PASSWORD` | Botun AuthMe şifresi (zorunlu) |
| `MC_LOGIN_CMD` | `/gir {pass}` (sunucuya göre) |
| `MC_REGISTER_CMD` | `/kayit {pass} {pass}` |
| `PAY_COMMAND` | `/pay {player} {amount}` |
| `PAY_RECEIVE_REGEX` | Ödeme algılama deseni — **sunucuya göre ayarla** |
| `COMMISSION` | `0.05` (=%5) |

### 3) Frontend

```bash
npm install
npm run dev              # http://localhost:5173
```

## ⚠️ Sunucuya göre ayarlanması gerekenler

Her sunucunun ekonomi/login eklentisi farklı mesaj basar. Bot bağlandığında
sohbete düşen mesajları gözlemleyip şunları doğrula:

1. **Ödeme algılama** (`PAY_RECEIVE_REGEX`): Birinden `/pay` aldığında sunucu ne
   yazıyor? Örn. `"Steve, sana 100 gönderdi"`. Regex bu mesajdan miktarı (ve
   gönderen adını) yakalamalı. Yanlış regex = para algılanmaz.
2. **Login komutu** (`MC_LOGIN_CMD`): `/gir` mi `/login` mi?
3. **Pay komutu** (`PAY_COMMAND`): Sunucuda para gönderme komutu `/pay` mi
   `/money pay` mı?

Bunları doğrulamak için backend loglarına bak: bot her chat mesajını işler.

## Üretim notları

- Bellek-içi değil: bakiyeler **SQLite**'ta (`server/archerytrade.db`) kalıcı tutulur.
- Tek bot tek ekonomi hesabıdır; yüksek hacimde sıra/limit düşün.
- HTTPS + gerçek domain arkasında çalıştır.

## Ubuntu 24.04 Sunucu Kurulumu

Tek komutla (root/sudo):

```bash
git clone https://github.com/umutarchery/archery-trade.git
sudo bash archery-trade/deploy/setup-ubuntu.sh
```

Script şunları yapar:
- Node.js 22, nginx, git kurar
- `archery` servis kullanıcısı oluşturur
- Frontend + backend build alır (`/opt/archery-trade`)
- systemd servisi (`archerytrade`) + nginx (static + `/api` proxy) ayarlar

Kurulumdan sonra:

```bash
# 1) Bot şifresini gir
sudo nano /opt/archery-trade/server/.env     # MC_PASSWORD=...

# 2) Servisi başlat
sudo systemctl start archerytrade

# 3) Logları izle
sudo journalctl -u archerytrade -f

# 4) Domain + HTTPS (opsiyonel)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d archerytrade.com
```

Site `http://SUNUCU_IP/` adresinde yayında olur. Frontend ve API aynı origin
altında (nginx `/api`'yi `127.0.0.1:8787`'e proxy'ler), bu yüzden CORS derdi yok.

Güncelleme:

```bash
cd /opt/archery-trade && sudo git pull
sudo npm ci && sudo npm run build
cd server && sudo npm ci && sudo npm run build
sudo systemctl restart archerytrade && sudo systemctl reload nginx
```

