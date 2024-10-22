ARG VERSION_DEBIAN=bookworm

ARG VERSION_NODE=16
ARG VERSION_PYTHON=3.10

ARG VERSION_SCIP_PYTHON=v0.6.0

FROM node:$VERSION_NODE-$VERSION_DEBIAN-slim as technology-node
FROM python:$VERSION_PYTHON-slim-$VERSION_DEBIAN as technology-python

FROM buildpack-deps:$VERSION_DEBIAN as base

COPY --link --from=technology-node /usr/local /usr/local
COPY --link --from=technology-python /usr/local /usr/local

# NOTE: ldconfig is needed for Python to understand where shared libraries are.
RUN ldconfig \
    # We remove pre-installed yarn and enable corepack.
    && rm -rf /usr/local/bin/yarn* \
    && corepack enable \
    # NOTE: Smoke tests while having as little side effects as possible.
    && node --version \
    && yarn --version \
    && npm --logs-max=0 --version \
    && PYTHONDONTWRITEBYTECODE=1 python3 --version \
    && pip --version

FROM base AS release

ARG VERSION_SCIP_PYTHON

# Install dependencies
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    git \
    bash \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install packages
RUN npm install -g @sourcegraph/scip-python@$VERSION_SCIP_PYTHON @sourcegraph/src

ENTRYPOINT [ "scip-python" ]
