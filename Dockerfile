FROM node:alpine
WORKDIR /app
COPY package*.json ./
COPY .env ./
RUN yarn 
COPY . . 
EXPOSE 3000
CMD yarn dev