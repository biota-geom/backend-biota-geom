FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ENV DATABASE_URL=postgresql://biota:biota@postgres:5432/biota_geom?schema=public
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run prisma:generate
RUN npm run build

FROM build AS migrator
CMD ["npm", "run", "prisma:migrate:deploy"]

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev --omit=peer --ignore-scripts
RUN ["node", "-e", "const fs = require('node:fs'); for (const path of ['node_modules/prisma', 'node_modules/mysql2', 'node_modules/deepmerge-ts', 'node_modules/@prisma/config']) fs.rmSync(path, { recursive: true, force: true });"]
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
