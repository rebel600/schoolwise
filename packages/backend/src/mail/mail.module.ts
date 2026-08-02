import { Global, Module } from "@nestjs/common";

import { MailService } from "./mail.service";

/** Global: several modules will send mail, and none should re-wire SMTP. */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
