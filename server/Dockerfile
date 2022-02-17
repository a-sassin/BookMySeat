FROM node:15.12.0-alpine
WORKDIR /usr/src/app
COPY install-redis.sh ./
RUN apk add musl-dev gcc make g++ zlib-dev linux-headers
RUN . install-redis.sh
COPY package*.json ./
RUN npm install
COPY . .
CMD ["sh", "-c", "redis-server > /dev/null 2>&1 & npm start"]