FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage de production avec Nginx
FROM nginx:alpine

# Remove default nginx config
RUN rm -f /etc/nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy our frontend nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
