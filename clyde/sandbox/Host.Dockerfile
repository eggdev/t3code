# The model gateway and the egress proxy on a Linux sandbox host. One image,
# two roles: `node src/main.ts gateway` and `node src/main.ts egress`.
# Source: packages/clyde-sandbox-host/src. Node runs the TypeScript directly.
FROM node:24.15.0-bookworm-slim
ARG CODEX_VERSION=0.163.0
RUN npm install -g @openai/codex@${CODEX_VERSION} && npm cache clean --force
WORKDIR /app
COPY host-src ./src
USER 1000:1000
