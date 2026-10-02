FROM node:24-alpine
WORKDIR /app
ARG APP_VERSION=0.1.0
ARG APP_COMMIT=local
ENV NODE_ENV=production PORT=8080 APP_VERSION=$APP_VERSION APP_COMMIT=$APP_COMMIT
COPY --chown=node:node app ./app
COPY --chown=node:node server.mjs leaderboard.mjs package.json ./
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
