# docker build -t node -f ./Dockerfile .

# syntax=docker/dockerfile:1.11
FROM node:lts-alpine AS builder

WORKDIR /veritable-ui

# Install base dependencies
RUN npm install -g npm@10.x.x

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci 
COPY . .
RUN npm run build

# Node_Modules stage
FROM node:lts-alpine AS modules

WORKDIR /veritable-ui

COPY package*.json ./
RUN npm ci --omit=dev

# Test stage
FROM node:current-bookworm-slim AS test

WORKDIR /veritable-ui

RUN npm install -g npm@10.x.x

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci
COPY . .
RUN npm run build

ARG NODE_ENV=test
ENV NODE_ENV=${NODE_ENV}

RUN npx playwright install --with-deps

CMD ["npm", "run", "test:playwright"]

# Service
FROM node:lts-alpine AS service

WORKDIR /veritable-ui

RUN apk add --no-cache coreutils curl
RUN npm -g install npm@10.x.x

COPY public ./public
COPY knexfile.js ./
COPY --from=builder /veritable-ui/package*.json ./
COPY --from=builder /veritable-ui/build ./build
COPY --from=modules /veritable-ui/node_modules ./node_modules

HEALTHCHECK --interval=30s  --timeout=20s \
    CMD curl -f http://localhost:3000/health || exit 1
EXPOSE 3000
CMD [ "npm", "start" ]
