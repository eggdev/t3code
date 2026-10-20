# The image each agent process runs in on a Linux sandbox host. It holds no
# credential: model calls go through the host's gateway, and the public
# internet through its egress proxy (docs/contributing/architecture/sandboxes.md).
FROM node:24.15.0-bookworm-slim
ARG CODEX_VERSION=0.163.0
ARG CLAUDE_VERSION=2.1.304
RUN apt-get update \
  && apt-get install -y --no-install-recommends git jq ripgrep ca-certificates tini curl wget \
    python3 python3-pip python3-venv build-essential pkg-config unzip xz-utils openssh-client \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g @openai/codex@${CODEX_VERSION} @anthropic-ai/claude-code@${CLAUDE_VERSION} \
  && npm cache clean --force \
  && mkdir -p /home/agent && chown 1000:1000 /home/agent
ENV HOME=/home/agent
USER 1000:1000
ENTRYPOINT ["/usr/bin/tini", "--"]
