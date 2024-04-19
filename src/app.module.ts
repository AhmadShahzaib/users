import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ConfigurationService,
  SharedModule,
} from '@shafiqrathore/logeld-tenantbackend-common-future';
import { ConfigModule } from '@nestjs/config';
import { Transport, ClientProxyFactory } from '@nestjs/microservices';
import AwsClient from 'util/config';
import { AppService } from './app.service';
import { UserSchema } from './mongoDb/schema/schema';
import { AppController } from './app.controller';
import { JwtAuthService } from 'jwt.service';
import { JwtModule } from '@nestjs/jwt';
import { EmailService } from 'email.service';
// import {
//   WinstonModule,
//   utilities as nestWinstonModuleUtilities,
// } from 'nest-winston';
// import * as winston from 'winston';

@Module({
  imports: [
    JwtModule.register({
      secret: '!A%D*G-JaNdRgUkXp2s5v8y/B?E(H+Mb',
      signOptions: { expiresIn: '72h' },
    }),
    SharedModule,
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forFeature([{ name: 'Users', schema: UserSchema }]),
    MongooseModule.forRootAsync({
      useFactory: async (configService: ConfigurationService) => ({
        uri: configService.mongoUri,
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
      inject: [ConfigurationService],
    }),
    // WinstonModule.forRootAsync({
    //   inject: [ConfigurationService],
    //   useFactory: async (configService: ConfigurationService) => ({
    //     transports: [
    //       new winston.transports.Console({
    //         format: winston.format.combine(
    //           winston.format.timestamp(),
    //           winston.format.ms(),
    //           nestWinstonModuleUtilities.format.nestLike(
    //             configService.get('SERVICE_NAME'),
    //             {
    //               prettyPrint: true,
    //             },
    //           ),
    //         ),
    //       }),
    //       new winston.transports.File({
    //         format: winston.format.combine(
    //           winston.format.timestamp(),
    //           winston.format.ms(),
    //           nestWinstonModuleUtilities.format.nestLike(
    //             configService.get('SERVICE_NAME'),
    //             {
    //               prettyPrint: true,
    //             },
    //           ),
    //         ),
    //         filename: `${configService.get('LOG_FILENAME')}.log`,
    //         dirname: 'logs',
    //       }),
    //     ],
    //   }),
    // }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtAuthService,
    EmailService,
    AwsClient,
    ConfigurationService,
    {
      provide: 'ROLE_SERVICE',
      useFactory: (config: ConfigurationService) => {
        const inspectServicePort = config.get('ROLE_MICROSERVICE_PORT');
        const inspectServiceHost = config.get('ROLE_MICROSERVICE_HOST');

        return ClientProxyFactory.create({
          transport: Transport.TCP,
          options: {
            port: Number(inspectServicePort),
            host: inspectServiceHost,
          },
        });
      },
      inject: [ConfigurationService],
    },
  ],
})
export class AppModule {
  static port: number | string;
  static isDev: boolean;

  constructor(private readonly _configurationService: ConfigurationService) {
    AppModule.port = AppModule.normalizePort(_configurationService.port);
    AppModule.isDev = _configurationService.isDevelopment;
  }

  /**
   * Normalize port or return an error if port is not valid
   * @param val The port to normalize
   */
  private static normalizePort(val: number | string): number | string {
    const port: number = typeof val === 'string' ? parseInt(val, 10) : val;

    if (Number.isNaN(port)) {
      return val;
    }

    if (port >= 0) {
      return port;
    }

    throw new Error(`Port "${val}" is invalid.`);
  }
}
