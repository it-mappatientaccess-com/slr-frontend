# Use Node.js v18 to align with your GitHub workflow
FROM node:18-alpine AS builder
ENV NODE_ENV production
# Add a work directory
WORKDIR /app
# Cache and Install dependencies
COPY package.json package-lock.json ./  
# Use the --legacy-peer-deps flag during installation
RUN npm ci --legacy-peer-deps --no-optional
# Copy app files
COPY . .
# Build the app
RUN npm run build

# Bundle static assets with nginx
FROM nginx:1.21.0-alpine as production
ENV NODE_ENV production
# Copy built assets from builder
COPY --from=builder /app/build /usr/share/nginx/html
# Add your nginx.conf
COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf
# Start nginx
CMD ["nginx", "-g", "daemon off;"]
