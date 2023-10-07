FROM node:20-alpine3.17

WORKDIR /app
COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
RUN npm install

COPY tsconfig.json /app/tsconfig.json
COPY src /app/src
RUN npm run build

CMD ["node", "dist/server.js"]

