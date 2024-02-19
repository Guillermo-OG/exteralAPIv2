FROM node:18.19.0

# FROM node:17-alpine3.14

WORKDIR /app

# COPY ./.env ./.env
# COPY ./package.json ./package.json
# COPY ./tsconfig.json ./tsconfig.json
COPY . .

RUN yarn install
# __COMANDO_BUILD__
RUN yarn build
# RUN ["cp", "src/environment.js", "dist/environment.js"]

EXPOSE 80

CMD [ "yarn", "start" ]
