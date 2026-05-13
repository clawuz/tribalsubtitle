FROM node:20-slim AS base

# Chrome/Chromium için gerekli bağımlılıklar (Remotion renderer)
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libxss1 \
  xdg-utils \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_PATH=/usr/bin/chromium

WORKDIR /app

# Bağımlılıkları yükle
COPY package.json package-lock.json ./
RUN npm ci --include=optional 2>&1 || npm install --include=optional

# Kaynak kodunu kopyala
COPY . .

# Build
RUN npm run build

# Üretim başlat
EXPOSE 3020
ENV PORT=3020
ENV HOSTNAME=0.0.0.0
CMD ["npm", "start"]
