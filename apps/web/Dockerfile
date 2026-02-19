FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Next standalone server reads HOSTNAME/PORT
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 3000
CMD ["npm", "run", "start"]
