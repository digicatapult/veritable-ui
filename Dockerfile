# syntax=docker/dockerfile:1.17
FROM node:lts-alpine AS builder

ARG NODE_OPTIONS='--no-experimental-strip-types'
WORKDIR /veritable-ui

# Install base dependencies
RUN npm install -g npm@11.x.x

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci 
COPY . .
RUN npm run build

# Service
FROM node:lts-alpine AS service

ARG NODE_OPTIONS='--no-experimental-strip-types'
WORKDIR /veritable-ui

RUN apk add --no-cache coreutils curl
RUN npm -g install npm@11.x.x

COPY package*.json ./
RUN npm ci --omit=dev

COPY public ./public
COPY knexfile.js ./
COPY --from=builder /veritable-ui/build ./build

HEALTHCHECK --interval=30s  --timeout=20s \
    CMD curl -f http://localhost:3000/health || exit 1
EXPOSE 3000
CMD [ "npm", "start" ]
