#This Dockerfile should work right the way out of the box, just fill in the empty strings with the correct values in the ENV section.
#This should work on top of the env.template file, so make sure THIS is the one you wanna correctly fill in the values for.

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm install react-scripts

# Copy source code
COPY . .

# Build React app (use empty URLs since frontend and backend are on same server)
# Keep these empty for same-origin deployment (frontend and backend on same domain)
ENV REACT_APP_API_URL=""
ENV REACT_APP_SERVER_DOMAIN=""
ENV DB_HOST="YOUR_DB_HOST"
ENV DB_USER="YOUR_DB_USER"
ENV DB_PASSWORD="YOUR_DB_PASSWORD"
ENV DB_DATABASE="YOUR_DATABASE"

# Build the React app for production
RUN npm run build

# Expose ports
EXPOSE 5000

# Set environment variables (can be overridden at runtime)
ENV NODE_ENV=production
ENV PORT=5000

# Start the server
CMD ["node", "server.js"]

