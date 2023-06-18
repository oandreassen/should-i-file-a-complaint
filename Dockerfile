# Use the official Node.js 14 image as the base image
FROM node:14

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

RUN npm install --only=production && npm cache clean --force && npm install -g typescript

# Install application dependencies in the root directory
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Navigate to the frontend directory
WORKDIR /app/frontend

# Install frontend dependencies
RUN npm install

# Build the frontend
RUN npm run build

# Navigate back to the root directory
WORKDIR /app

# Set the command to start the application
CMD ["npm", "run", "start"]