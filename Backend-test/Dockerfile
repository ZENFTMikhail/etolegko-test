FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
EXPOSE 3001
CMD ["npm", "run", "start:dev"]