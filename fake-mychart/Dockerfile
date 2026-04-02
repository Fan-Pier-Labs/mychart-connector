FROM oven/bun
WORKDIR /app

COPY package.json ./
RUN bun install

COPY . .
RUN bun run build

ENV NODE_ENV=production
EXPOSE 8080
CMD ["sh", "-c", "bun run start -p ${PORT:-8080}"]
