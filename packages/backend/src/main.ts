import "reflect-metadata";

import { Logger, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/all-exceptions.filter";
import type { Env } from "./config/env";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<Env, true>);

  app.useGlobalFilters(new AllExceptionsFilter());

  /* Versioned from day one — see docs/03-backend.md. */
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  app.setGlobalPrefix("api");

  /*
   * Explicit origins, never a wildcard. `credentials: true` is required for
   * the httpOnly refresh cookie, and a wildcard origin with credentials is
   * both rejected by browsers and a serious misconfiguration.
   */
  app.enableCors({
    origin: config.get("CORS_ORIGINS", { infer: true }),
    credentials: true,
  });

  if (config.get("NODE_ENV", { infer: true }) !== "production") {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle("SchoolWise API")
        .setDescription("Multi-tenant school management platform")
        .setVersion("1.0")
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup("api/docs", app, document);
  }

  app.enableShutdownHooks();

  const port = config.get("PORT", { infer: true });
  await app.listen(port);

  new Logger("Bootstrap").log(`SchoolWise API listening on port ${port}`);
}

void bootstrap();
