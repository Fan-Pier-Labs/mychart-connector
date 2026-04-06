FROM oven/bun
WORKDIR /app

# Install deps for web and scrapers
COPY web/package.json web/bun.lock ./web/
COPY scrapers/package.json ./scrapers/
RUN cd web && bun install --frozen-lockfile
RUN cd scrapers && bun install

# Copy source
COPY web/ ./web/
COPY scrapers/ ./scrapers/
COPY shared/ ./shared/
# clo-to-jpg-converter test files excluded via .dockerignore; source + wasm included

# Build (NEXT_PUBLIC_* must be set at build time for Next.js inlining)
ARG NEXT_PUBLIC_BASE_URL=https://openrecord.fanpierlabs.com
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
RUN cd web && bun --bun next build

ENV NODE_ENV=production
EXPOSE 8080

WORKDIR /app/web
CMD ["sh", "-c", "bun --bun next start -p ${PORT:-8080}"]
