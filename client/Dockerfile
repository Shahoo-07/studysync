FROM node:20-slim

WORKDIR /app

COPY package*.json ./

# Fix for rollup optional dependencies issue
RUN npm install --force

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
