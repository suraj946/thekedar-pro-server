FROM node:18.17.1

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT=4000
ENV JWT_SECRET=your-secret-key
ENV JWT_TOKEN_EXPIRY=15d
ENV COOKIE_EXPIRE_DAY=15
ENV CORS_ORIGIN=*

EXPOSE ${PORT}

CMD [ "npm", "run", "dev" ]