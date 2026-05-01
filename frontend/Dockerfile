# Stage 1: Build the React app
FROM node:20-alpine as build
WORKDIR /app

# Copy shared folder (dependency)
COPY shared ./shared

# Copy frontend folder
COPY frontend ./frontend

# Build frontend
WORKDIR /app/frontend
RUN npm install
# Set the backend URL during build
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 8080
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
