import type { Page } from "../App";

export default function HomePage({ go }: { go: (p: Page) => void }) {
  return (
    <div>
      <div className="hero">
        <span className="melon">🏹</span>
        <h1>ArcheryTrade</h1>
        <p className="muted" style={{ fontSize: 18, maxWidth: 600, margin: "0 auto" }}>
          chickennw'nin karpuz odaları. Oyun paranı yatır, odaya gir, herkese
          karpuz çıksın. En yüksek karpuz potu kapar. Kasa sadece %5 alır.
        </p>
        <div className="actions">
          <button className="btn" onClick={() => go("rooms")}>
            🍉 Odalara Gir
          </button>
          <button className="btn ghost" onClick={() => go("wallet")}>
            💰 Cüzdan
          </button>
        </div>
      </div>

      <div className="feature-grid">
        <div className="card">
          <div className="ico">1️⃣</div>
          <h3>Giriş Yap</h3>
          <p className="muted">
            Kullanıcı adını gir, çıkan kodu oyunda{" "}
            <b>/msg ArcheryTrade &lt;kod&gt;</b> ile yaz.
          </p>
        </div>
        <div className="card">
          <div className="ico">2️⃣</div>
          <h3>Para Yatır</h3>
          <p className="muted">
            Oyunda <b>/pay ArcheryTrade &lt;miktar&gt;</b> yaz. Bot algılar,
            bakiyene ekler.
          </p>
        </div>
        <div className="card">
          <div className="ico">3️⃣</div>
          <h3>Odaya Gir</h3>
          <p className="muted">
            Bahsini koy, odaya katıl. Herkese 1–100 arası karpuz çıkar.
          </p>
        </div>
        <div className="card">
          <div className="ico">🏆</div>
          <h3>Kazan</h3>
          <p className="muted">
            En yüksek karpuz potu kazanır. Bakiyeni istediğin an oyuna geri çek.
          </p>
        </div>
      </div>

      <div className="card section">
        <h2>Komisyon Nasıl İşler?</h2>
        <p className="muted" style={{ lineHeight: 1.9 }}>
          Her odada toplanan pot'tan <b>%5</b> komisyon kesilir, kalan %95
          kazanana ödenir. Örneğin 4 kişi 100'er koyduysa pot 400 olur; kazanan
          380 alır, 20 komisyon kasaya kalır. Tüm karpuz çekilişleri sunucu
          tarafında güvenli rastgele üretilir.
        </p>
      </div>
    </div>
  );
}
