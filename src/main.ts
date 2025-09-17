// src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser'

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(bodyParser.json({limit:'10mb'}))
  app.use(bodyParser.urlencoded({limit:'10mb',extended:true}))

  app.enableCors({
    origin: 'http://localhost:3000', // Allow requests from the frontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // FIX: Run the backend on the standard port 3000
  await app.listen(3001); 
  console.log(`🚀 Backend server running at http://localhost:3001`);
}
bootstrap();

