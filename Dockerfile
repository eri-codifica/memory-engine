# Use the official lightweight Node.js 20 image
FROM node:20-slim

# Create app directory
WORKDIR /app

# Copy package files first (optimizes build caching)
COPY package*.json ./

# Install ONLY production dependencies (saves space)
RUN npm install --omit=dev

# Copy the rest of the application code
COPY . .

# Cloud Run listens on port 8080 by default
ENV PORT=8080
EXPOSE 8080

# Start the engine
CMD [ "node", "src/index.js" ]
