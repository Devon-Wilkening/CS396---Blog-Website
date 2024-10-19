# Use the official Node.js image
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

# Install tini to manage Watchtower and Node server processes
RUN apt-get update && apt-get install -y tini

# Copy the rest of the application
COPY . .

# Expose port 3000
EXPOSE 3000

# Change CMD to run both the Node.js app and Watchtower
CMD ["/usr/bin/tini", "--", "sh", "-c", "npm start & watchtower --cleanup --interval 30 devonwilkening/blog-server"]
