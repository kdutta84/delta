# Stage 1: Run Nginx to serve the app
FROM nginx:alpine

# Copy the static build files from your dist folder to Nginx
COPY ./dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
