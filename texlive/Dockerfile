FROM texlive/texlive:latest

# Install Node.js 20 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m compiler

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY server.js .

RUN mkdir -p /tmp/latex-compile && chown compiler:compiler /tmp/latex-compile

USER compiler

EXPOSE 3001

CMD ["node", "server.js"]
