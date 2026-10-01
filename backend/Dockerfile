FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .

# Build-time only — do NOT leave this as a runtime ENV (Railway injects real DATABASE_URL).
ARG DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
RUN DATABASE_URL="$DATABASE_URL" npx prisma generate && npx tsc

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "scripts/start-prod.js"]
