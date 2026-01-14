# 1. Этап зависимостей
FROM node:20-alpine AS deps
# Устанавливаем libc6-compat, это часто нужно для Next.js и новых библиотек в Alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Копируем файлы package.json и package-lock.json
COPY package.json package-lock.json ./

# ВАЖНО: Используем 'npm install' вместо 'npm ci'
# Это пересоздаст node_modules специально под Linux, избегая конфликтов платформы
RUN npm install

# 2. Этап сборки
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Отключаем телеметрию Next.js для ускорения
ENV NEXT_TELEMETRY_DISABLED=1

# Запускаем сборку
RUN npm run build

# 3. Этап запуска (Runner)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копируем публичную папку
COPY --from=builder /app/public ./public

# Копируем автоматически сгенерированный "standalone" сервер
# (Для этого в next.config.ts должно быть output: 'standalone')
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]