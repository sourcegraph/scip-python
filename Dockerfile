# Start from a Node.js base image
FROM node:16-alpine

# Install necessary dependencies for building Python
RUN apk add --no-cache \
    git \
    build-base \
    openssl-dev \
    zlib-dev \
    bzip2-dev \
    readline-dev \
    sqlite-dev \
    xz-dev \
    tk-dev \
    libffi-dev \
    ncurses-dev \
    linux-headers

# Download, extract, and install Python 3.12
RUN wget https://www.python.org/ftp/python/3.12.0/Python-3.12.0.tar.xz && \
    tar -xf Python-3.12.0.tar.xz && \
    cd Python-3.12.0 && \
    ./configure --enable-optimizations && \
    make -j$(nproc) && \
    make install && \
    cd .. && \
    rm -rf Python-3.12.0 Python-3.12.0.tar.xz && \
    ln -sf /usr/local/bin/python3.12 /usr/local/bin/python && \
    ln -sf /usr/local/bin/pip3.12 /usr/local/bin/pip

# Upgrade pip
RUN pip3.12 install --upgrade pip

# Add your required files
ADD packages/pyright-scip/sourcegraph-scip-python-0.6.0.tgz /

RUN npm --prefix /package install
COPY index.py /

WORKDIR /projects/data

# Set entrypoint
ENTRYPOINT ["python", "/index.py"]
