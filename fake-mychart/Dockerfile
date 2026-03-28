FROM oven/bun
WORKDIR /app

COPY package.json ./
RUN bun install

COPY . .
RUN bun run build

EXPOSE 3000
CMD ["sh", "-c", "bun run start -p ${PORT:-3000}"]
