# Use official Node.js image
FROM node:16

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Rebuild native dependencies (like bcrypt)
RUN npm rebuild bcrypt --build-from-source

# Install curl
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install Watchtower
RUN curl -sSL https://github.com/containrrr/watchtower/releases/latest/download/watchtower_linux_amd64.tar.gz | tar xz -C /usr/local/bin && \
    chmod +x /usr/local/bin/watchtower

# Copy the rest of the application
COPY . .

# Expose port 3000 and start the app
EXPOSE 3000
CMD ["npm", "start"]
