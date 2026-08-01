import { Global, Module, type OnApplicationShutdown } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import type { Env } from "../config/env";

import { DATABASE } from "./database.types";
import * as schema from "./schema";

const CONNECTION = Symbol("PG_CONNECTION");

@Global()
@Module({
  providers: [
    {
      provide: CONNECTION,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        postgres(config.get("DATABASE_URL", { infer: true }), {
          /*
           * Every request runs inside a transaction that SET LOCALs the
           * tenant. Prepared statements are disabled because they are cached
           * per connection and would outlive the transaction the tenant
           * setting is scoped to.
           */
          prepare: false,
        }),
    },
    {
      provide: DATABASE,
      inject: [CONNECTION],
      useFactory: (sql: postgres.Sql) => drizzle(sql, { schema }),
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor() {}

  async onApplicationShutdown(): Promise<void> {
    /* postgres-js closes its pool on process exit; explicit hook kept for
       future graceful-shutdown work. */
  }
}
