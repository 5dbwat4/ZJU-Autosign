FROM node:slim

WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g pnpm@latest

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY core ./core

CMD ["node", "core/autosign.js"]
