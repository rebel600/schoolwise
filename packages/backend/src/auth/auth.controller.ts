import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UsePipes,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

import { ZodValidationPipe } from "../common/zod-validation.pipe";
import type { AuthenticatedRequest } from "../tenancy/authenticated-request";

import { loginSchema, type LoginRequest } from "./auth.schemas";
import { AuthService, type AuthResult } from "./auth.service";
import { Public } from "./public.decorator";

/** Name of the httpOnly cookie carrying the refresh token. */
const REFRESH_COOKIE = "schoolwise_refresh";

@ApiTags("auth")
@Controller({ path: "auth", version: "1" })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(loginSchema))
  @ApiOperation({ summary: "Authenticate and open a session" })
  async login(
    @Body() body: LoginRequest,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(
      body.email,
      body.password,
      { ipAddress: req.ip, userAgent: req.headers["user-agent"] },
      body.schoolId,
    );

    return this.respond(result, res);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Rotate the refresh token and issue a new access token",
  })
  async refresh(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = this.readRefreshCookie(req);

    if (!token) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    const result = await this.auth.refresh(token, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return this.respond(result, res);
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Revoke the current session" })
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token = this.readRefreshCookie(req);

    if (token) {
      await this.auth.logout(token);
    }

    /* Cleared unconditionally, so a stale cookie never lingers. */
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  @Get("me")
  @ApiOperation({ summary: "The authenticated principal" })
  me(@Req() req: AuthenticatedRequest) {
    return {
      success: true,
      data: {
        id: req.user?.sub,
        schoolId: req.user?.schoolId,
        roles: req.user?.roles,
        permissions: req.user?.permissions,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * The access token is returned in the BODY, for the client to hold in
   * memory. The refresh token goes into an httpOnly cookie that JavaScript
   * cannot read.
   *
   * That split is the point: an XSS can read the short-lived access token but
   * cannot steal the long-lived refresh token. Returning both in the body —
   * or storing either in localStorage — would make an XSS a full account
   * takeover. See ADR-0005.
   */
  private respond(result: AuthResult, res: Response) {
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      ...this.cookieOptions(),
      expires: result.expiresAt,
    });

    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "strict" as const,
      /* Scoped to the refresh route only — not sent with every API call. */
      path: "/api/v1/auth",
    };
  }

  private readRefreshCookie(req: AuthenticatedRequest): string | null {
    const cookies = (req as { cookies?: Record<string, string> }).cookies;
    return cookies?.[REFRESH_COOKIE] ?? null;
  }
}
