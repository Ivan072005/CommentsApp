# ---------- 1. Сборка React-приложения ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Пустой адрес API = запросы идут на тот же сайт (/api, /graphql, /hubs), их проксирует nginx
ENV VITE_API_URL=
RUN npm run build

# ---------- 2. Раздача статики через nginx ----------
FROM nginx:1.27-alpine

# nginx.conf — шаблон: при старте образ nginx подставляет переменные окружения
# и кладёт готовый файл в /etc/nginx/conf.d/default.conf.
# Подставляются только переменные, начинающиеся с API_ (свои $host, $scheme nginx не трогаем).
ENV API_UPSTREAM=api:8080
ENV NGINX_ENVSUBST_FILTER=^API_
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
