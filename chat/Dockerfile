FROM node:20-bullseye

WORKDIR /app
COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
RUN npm install

COPY tsconfig.json /app/tsconfig.json
COPY src /app/src
RUN npm run build

EXPOSE 42069
EXPOSE 1337

CMD ["node", "/app/dist/server.js"]

