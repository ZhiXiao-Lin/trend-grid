import { HttpModule } from '@ionia/http';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import config from './config';
import { Config, Order } from './model';
import { BinanceService, PusherService } from './service';
import { GridStrategy } from './strategy';

const ENV = process.env.NODE_ENV ?? 'dev';
const SYNC = process.env.SYNC ? Boolean(process.env.SYNC) : false;

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [config],
      envFilePath: `env/.${ENV}.env`,
      isGlobal: true,
    }),
    HttpModule.register({}),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        charset: 'utf8mb4',
        type: 'mysql',
        host: config.get('database.host'),
        port: config.get<number>('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.database'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: SYNC,
        logging: SYNC,
        logger: 'advanced-console',
      }),
    }),
    TypeOrmModule.forFeature([Config, Order]),
  ],
  providers: [BinanceService, PusherService, GridStrategy],
})
export class AppModule {}
