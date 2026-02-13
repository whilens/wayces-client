# Этап 1: сборка React-приложения
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Базовый URL API и версия фронта (для автообновления SPA) — аргументами сборки.
ARG REACT_APP_API_URL=/api
ARG REACT_APP_FRONTEND_VERSION=
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_FRONTEND_VERSION=$REACT_APP_FRONTEND_VERSION

RUN npm run build

# Этап 2: раздача статики через Nginx
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

