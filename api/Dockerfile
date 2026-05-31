FROM node:22-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install --production

# Copy source
COPY . .

# Ensure /data directory exists (volume will mount over it)
RUN mkdir -p /data

EXPOSE 3000

CMD ["npm", "start"]
