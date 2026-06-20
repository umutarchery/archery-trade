#!/usr/bin/env bash
# ArcheryTrade — Ubuntu 24.04 kurulum scripti
# Kullanım:  sudo bash deploy/setup-ubuntu.sh
set -euo pipefail

APP_DIR=/opt/archery-trade
REPO=https://github.com/umutarchery/archery-trade.git
NODE_MAJOR=22

echo "==> Sistem güncelleniyor"
apt-get update -y
apt-get install -y curl git nginx ca-certificates gnupg build-essential

echo "==> Node.js ${NODE_MAJOR} kuruluyor (NodeSource)"
if ! command -v node >/dev/null || [[ "$(node -v)" != v${NODE_MAJOR}* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash -
  apt-get install -y nodejs
fi
node -v

echo "==> Servis kullanıcısı 'archery'"
id -u archery >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin archery

echo "==> Kod çekiliyor -> ${APP_DIR}"
if [[ -d ${APP_DIR}/.git ]]; then
  git -C ${APP_DIR} pull
else
  git clone ${REPO} ${APP_DIR}
fi

echo "==> Frontend build"
cd ${APP_DIR}
npm ci
npm run build            # -> ${APP_DIR}/dist

echo "==> Backend build"
cd ${APP_DIR}/server
npm ci
npm run build            # -> ${APP_DIR}/server/dist

echo "==> .env kontrolü"
if [[ ! -f ${APP_DIR}/server/.env ]]; then
  cp ${APP_DIR}/server/.env.example ${APP_DIR}/server/.env
  echo "!!! ${APP_DIR}/server/.env oluşturuldu — MC_PASSWORD'ü DOLDUR sonra servisi başlat."
fi

echo "==> İzinler"
chown -R archery:archery ${APP_DIR}

echo "==> systemd servisi"
cp ${APP_DIR}/deploy/archerytrade.service /etc/systemd/system/archerytrade.service
systemctl daemon-reload
systemctl enable archerytrade

echo "==> nginx"
cp ${APP_DIR}/deploy/nginx.conf /etc/nginx/sites-available/archerytrade
ln -sf /etc/nginx/sites-available/archerytrade /etc/nginx/sites-enabled/archerytrade
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo ""
echo "================================================================"
echo " Kurulum bitti."
echo " 1) ${APP_DIR}/server/.env içine MC_PASSWORD'ü yaz."
echo " 2) sudo systemctl start archerytrade"
echo " 3) Loglar:  journalctl -u archerytrade -f"
echo " 4) Site:    http://SUNUCU_IP/  (domain + HTTPS için certbot)"
echo "================================================================"
