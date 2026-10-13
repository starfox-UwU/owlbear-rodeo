# 本镜像用于本地开发环境，运行 Vite 前端开发服务器
# Production builds are produced with `yarn build` (see README).

FROM node:24-alpine AS deps

RUN corepack enable
# The `ammo.js` dependency is resolved from a GitHub commit, so git is required.
RUN apk add --no-cache git
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app
WORKDIR /home/node/app

COPY --chown=node:node package.json yarn.lock .yarnrc.yml ./

USER node
RUN yarn install --immutable && yarn cache clean

FROM node:24-alpine

RUN corepack enable
USER node
ENV NODE_ENV=development
WORKDIR /home/node/app

COPY --chown=node:node package.json yarn.lock .yarnrc.yml tsconfig.json vite.config.ts ./
COPY --chown=node:node index.html ./
COPY --chown=node:node public ./public
COPY --chown=node:node src ./src
COPY --chown=node:node --from=deps /home/node/app/node_modules ./node_modules

EXPOSE 3000
# vite.config.ts sets `server.host = true`, so the dev server binds 0.0.0.0.
CMD ["yarn", "dev"]
