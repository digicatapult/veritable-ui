# syntax=docker/dockerfile:1.28@sha256:bb22d9815c728170f72750f4e5b0d672e06176142e1d602c7e66c050100b7e5b
FROM node:26.13.0-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216 AS builder

RUN npm install -g npm@12.0.1

WORKDIR /veritable-ui

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci 
COPY . .
RUN npm run build

# Service
FROM node:26.13.0-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216 AS service

RUN npm install -g npm@12.0.1

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
