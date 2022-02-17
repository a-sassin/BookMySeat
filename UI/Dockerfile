FROM node:12.18.3-alpine as build
LABEL stage=builder
WORKDIR /app
COPY package*.json /app/
RUN npm ci
COPY . /app
ARG BUILD=build
RUN npm run $BUILD
FROM nginx:1.15.8-alpine
RUN sed -i 's|index  index.html index.htm;|try_files $uri /index.html;|' /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/book-seat /usr/share/nginx/html
ENTRYPOINT [ "nginx", "-g", "daemon off;" ]