# syntax=docker/dockerfile:1.16

FROM node:lts-bookworm-slim AS test

WORKDIR /veritable-ui

RUN npm install -g npm@11.x.x

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci
COPY . .
RUN npm run build

ARG NODE_ENV=test
ENV NODE_ENV=${NODE_ENV}

RUN npx playwright install --with-deps

CMD ["npm", "run", "test:playwright"]
