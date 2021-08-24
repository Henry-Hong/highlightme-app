FROM node:16

WORKDIR /usr/highlightme-app/

COPY ./package*.json ./
COPY ./tsconfig.json ./
COPY ./src ./src
COPY ./env ./env

RUN yarn
RUN yarn build

EXPOSE 3001

CMD ["node","./build/app.js"]