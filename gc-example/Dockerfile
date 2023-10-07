FROM node:20-alpine3.16
WORKDIR /app

COPY ./dist /app/src
ARG RANDOM
ARG TIME
ARG OBJECT_COUNT
ARG TIME_TO_RUN

CMD ["node", "--trace-gc", "/app/src/index.js"]

