FROM node:20-alpine AS base
RUN apk add --no-cache ffmpeg python3 make g++ curl
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -f http://localhost:5000/health || exit 1
CMD ["node", "src/server.js"]
