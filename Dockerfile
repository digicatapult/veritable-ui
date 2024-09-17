# syntax=docker/dockerfile:1.10
FROM node:current-alpine AS builder

WORKDIR /veritable-ui

# Install base dependencies
RUN npm install -g npm@10.x.x

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci
COPY . .
RUN npm run build:dist

# service
FROM node:current-alpine AS service

WORKDIR /veritable-ui

RUN apk add --update coreutils
RUN npm -g install npm@10.x.x

COPY package*.json ./
RUN npm ci --omit-dev

COPY public ./public
COPY knexfile.js ./
COPY --from=builder /veritable-ui/dist ./dist

EXPOSE 80
CMD [ "npm", "start" ]
