import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { sql } from "drizzle-orm";

import { DATABASE, type Database } from "../database/database.types";

@ApiTags("health")
@Controller({ path: "health", version: "1" })
export class HealthController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @Get()
  @ApiOperation({ summary: "Liveness and dependency check" })
  async check(): Promise<{
    success: true;
    data: { status: string; database: string };
    timestamp: string;
  }> {
    let database = "up";

    try {
      await this.db.execute(sql`SELECT 1`);
    } catch {
      database = "down";
    }

    return {
      success: true,
      data: { status: "ok", database },
      timestamp: new Date().toISOString(),
    };
  }
}
