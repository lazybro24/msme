FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .

# Dummy URL for prisma generate only — never pass real DATABASE_URL as a build arg
# (Railway would expand it into image build logs).
RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" npx prisma generate && npx tsc

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "scripts/start-prod.js"]
