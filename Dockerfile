FROM node:17

WORKDIR /usr/highlightme-app/

COPY ./package*.json ./
COPY ./tsconfig.json ./
COPY ./src ./src
COPY ./env ./env

RUN yarn
RUN yarn build

COPY ./src/data ./build/data

EXPOSE 3001

CMD ["node","./build/app.js"]