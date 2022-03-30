import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GridStrategy } from './strategy';

async function bootstrap() {
  const logger = new Logger(bootstrap.name);
  const app = await NestFactory.createApplicationContext(AppModule);

  const grid = app.get(GridStrategy);

  if (process.env.CONFIG) {
    logger.log('初始化网格配置');
    await grid.config();
    await app.close();
    process.exit(0);
  }

  if (!!process.env.SYNC) {
    logger.log('同步数据库');
    await app.close();
    process.exit(0);
  }

  await grid.start();
}
bootstrap();
