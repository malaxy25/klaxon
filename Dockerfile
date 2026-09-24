FROM node:24-alpine
WORKDIR /app

# Nur die Manifeste zuerst -> Cache-freundlicher npm ci
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/

RUN npm ci

COPY . .
RUN npm run build:shared && npm run build:server

ENV NODE_ENV=production
EXPOSE 2567
CMD ["node", "packages/server/dist/main.js"]
