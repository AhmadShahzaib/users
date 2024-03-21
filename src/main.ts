import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import * as helmet from 'helmet';
import {
  HttpExceptionFilter,
  SnakeCaseInterceptor,
  MessagePatternResponseInterceptor,
  MongoExceptionFilter,
} from '@shafiqrathore/logeld-tenantbackend-common-future';
import * as requestIp from 'request-ip';

import configureSwagger from './swaggerConfigurations';
import { AppModule } from './app.module';
import { CustomInterceptor } from 'util/customInterceptors';
// import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new MessagePatternResponseInterceptor());
  const conf = app.get<ConfigService>(ConfigService);
  // app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))
  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      port: conf.get('USER_MICROSERVICE_PORT'),
      retryAttempts: 5,
      retryDelay: 5000,
    },
  });
  await app.startAllMicroservices();
  console.log('Microservice is listening');

  const logger = new Logger('Main');
  const globalPrefix = '/api';

  app.enableCors();
  app.use(helmet.referrerPolicy({ policy: 'same-origin' }));
  app.use(requestIp.mw());

  // Build the swagger doc only in dev mode
  configureSwagger(app, logger);

  app.setGlobalPrefix(globalPrefix);

  // Validate query params and body
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  app.useGlobalFilters(new MongoExceptionFilter());
  // Convert exceptions to JSON readable format
  app.useGlobalFilters(new HttpExceptionFilter());

  // Convert all JSON object keys to snake_case
  app.useGlobalInterceptors(new SnakeCaseInterceptor());
  app.use(CustomInterceptor);
  await app.listen(AppModule.port);

  // Log current url of app
  let baseUrl = app.getHttpServer().address().address;
  if (baseUrl === '0.0.0.0' || baseUrl === '::') {
    baseUrl = 'localhost';
  }

  logger.log(`Listening to http://${baseUrl}:${AppModule.port}${globalPrefix}`);
}
bootstrap();
