FROM node:24-bookworm-slim

ARG LILYPOND_VERSION=2.26.0
ENV LILYPOND_BIN=/opt/lilypond/bin/lilypond

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl fontconfig \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fL --retry 3 "https://gitlab.com/lilypond/lilypond/-/releases/v${LILYPOND_VERSION}/downloads/lilypond-${LILYPOND_VERSION}-linux-x86_64.tar.gz" -o /tmp/lilypond.tar.gz \
    && mkdir /opt/lilypond \
    && tar -xzf /tmp/lilypond.tar.gz -C /opt/lilypond --strip-components=1 \
    && rm /tmp/lilypond.tar.gz \
    && /opt/lilypond/bin/lilypond --version

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build \
    && chown -R node:node /app

ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0"]
