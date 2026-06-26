FROM node:20-slim

WORKDIR /app

# NOTE: This Dockerfile is for local development only.
# Production frontend hosting is Cloudflare Pages (see docs/SPEC.md).
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]