# === frontend/Dockerfile ===

# ===========================
# Stage 1: build
# ===========================
FROM node:22-alpine AS builder

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY env.d.ts ./
COPY src/ ./src/
COPY public/ ./public/

RUN npm run build

# ===========================
# Stage 2: production
# ===========================
FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
