# syntax=docker/dockerfile:1.21
FROM node:24-alpine AS builder

WORKDIR /veritable-ui

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci 
COPY . .
RUN npm run build

# Service
FROM node:24-alpine AS service

WORKDIR /veritable-ui

RUN apk add --no-cache coreutils curl

COPY package*.json ./
RUN npm ci --omit=dev

COPY public ./public
COPY knexfile.js ./
COPY --from=builder /veritable-ui/build ./build

HEALTHCHECK --interval=30s  --timeout=20s \
    CMD curl -f http://localhost:3000/health || exit 1
EXPOSE 3000
CMD [ "npm", "start" ]
