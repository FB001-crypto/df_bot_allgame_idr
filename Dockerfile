FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . ./

# 默认数据目录，可在 Fly 上通过卷挂载覆盖
ENV DATA_DIR=/data

EXPOSE 3000

CMD ["npm", "run", "start"]


