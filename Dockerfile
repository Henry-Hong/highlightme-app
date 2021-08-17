FROM node:16

WORKDIR /highlightme-node/

COPY ./package*.json ./
COPY ./tsconfig.json ./
COPY ./src ./src
COPY ./env ./env

RUN npm install
RUN npm run build

EXPOSE 3001

CMD ["node","./build/app.js"]