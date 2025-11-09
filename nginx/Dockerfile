FROM nginx:alpine

# Remove default config
RUN rm -f /etc/nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy our complete nginx.conf
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
