FROM node:18
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY src ./src
COPY db ./db
CMD ["npm", "start"]
