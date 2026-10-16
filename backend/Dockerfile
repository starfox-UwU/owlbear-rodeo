FROM node:24-alpine AS builder

RUN corepack enable
# bcrypt is a native addon: keep a toolchain around in case no prebuilt
# binary matches this Node ABI on musl.
RUN apk add --no-cache python3 make g++
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY --chown=node:node package.json yarn.lock .yarnrc.yml ./

USER node
ENV NODE_ENV=development
RUN yarn install --immutable && yarn cache clean
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node tsconfig.json ./
RUN yarn run build && yarn run check:imports

# Re-install without devDependencies for the runtime image.
FROM builder AS install
ENV NODE_ENV=production
USER root
RUN rm -rf ./node_modules
USER node
RUN yarn install --immutable --production && yarn cache clean

FROM node:24-alpine

RUN corepack enable
RUN mkdir -p /home/node/app/cache/assets && chown -R node:node /home/node/app/cache
USER node
ENV NODE_ENV=production
ENV ASSET_CACHE_DIR=/home/node/app/cache/assets
WORKDIR /home/node/app

COPY --chown=node:node package.json yarn.lock .yarnrc.yml ./
COPY --chown=node:node --from=builder /home/node/app/build ./build
COPY --chown=node:node --from=install /home/node/app/node_modules ./node_modules

EXPOSE 9000
CMD ["node", "./build/index.js"]
