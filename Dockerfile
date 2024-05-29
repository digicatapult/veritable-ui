# syntax=docker/dockerfile:1.7
FROM node:current-alpine as builder

WORKDIR /veritable-ui

# Install base dependencies
RUN npm install -g npm@10.x.x

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci
COPY . .
RUN npm run build

# service
FROM node:current-alpine as service

WORKDIR /veritable-ui

RUN apk add --update coreutils
RUN npm -g install npm@10.x.x

COPY package*.json ./
RUN npm ci --omit-dev

COPY public ./public
COPY migrations ./migrations
COPY knexfile.ts ./
COPY --from=builder /veritable-ui/build ./build

EXPOSE 80
CMD [ "npm", "start" ]
