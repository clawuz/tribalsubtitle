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

# Build (NEXT_PUBLIC vars must be available at build time)
ARG NEXT_PUBLIC_RENDER_URL=https://tribalsubtitle-343168496187.us-central1.run.app
ARG NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBLwEV8lJ1y7UPjNaC4QYi51koic0OGc5Q
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tribalsubtitle.firebaseapp.com
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID=tribalsubtitle
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tribalsubtitle.firebasestorage.app
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=343168496187
ARG NEXT_PUBLIC_FIREBASE_APP_ID=1:343168496187:web:aa76e7031e08399ae3a21e
ENV NEXT_PUBLIC_RENDER_URL=$NEXT_PUBLIC_RENDER_URL
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
RUN npm run build

# Üretim başlat
EXPOSE 3020
ENV PORT=3020
ENV HOSTNAME=0.0.0.0
CMD ["npm", "start"]
