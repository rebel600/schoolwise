import {
  BadRequestException,
  Injectable,
  type ArgumentMetadata,
  type PipeTransform,
} from "@nestjs/common";
import type { ZodType } from "zod";

/**
 * Validates and STRIPS unknown keys.
 *
 * Stripping matters as much as validating: a client sending
 * `{ name: "x", schoolId: "other-school" }` has `schoolId` removed before the
 * service ever sees it. That is defense in depth behind the rule that no
 * request DTO declares `schoolId` in the first place.
 *
 * See docs/03-backend.md — "Unknown keys are stripped".
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        message: "Validation failed.",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join(".") || "(root)",
          message: issue.message,
        })),
      });
    }

    return result.data;
  }
}
