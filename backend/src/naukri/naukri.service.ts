import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from './encryption.service';
import { Browser, BrowserContext, Page } from 'playwright';
import { BrowserManager } from '../automation/playwright/browser.manager';
import {
  performNaukriLogin,
  submitNaukriOtp,
  verifyNaukriSession,
} from '../automation/playwright/naukri-login';
import { ConnectNaukriDto } from './dto/connect-naukri.dto';

interface PendingOtpSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  email: string;
  createdAt: number;
}

@Injectable()
export class NaukriService {
  private readonly logger = new Logger(NaukriService.name);

  private readonly pendingOtpSessions = new Map<
    string,
    PendingOtpSession
  >();

  private readonly OTP_SESSION_TIMEOUT = 5 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
    private browserManager: BrowserManager,
  ) {}

  // ═══════════════════════════════════════
  // CONNECT NAUKRI — Login + Save Session
  // ═══════════════════════════════════════
  async connect(userId: string, dto: ConnectNaukriDto) {
    this.logger.log(`Connecting Naukri for user: ${userId}`);

    let browser: any = null;

    try {
      // ─── Step 1: Browser kholo ───
      const { browser: b, context, page } =
        await this.browserManager.createContext();
      browser = b;

      // ─── Step 2: Naukri pe login karo ───
      const loginResult = await performNaukriLogin(
        page,
        context,
        dto.naukriEmail,
        dto.naukriPassword,
      );

      // ─── Step 3: OTP required ───
      if (loginResult.needsOTP) {
        this.pendingOtpSessions.set(userId, {
          browser: b,
          context,
          page,
          email: dto.naukriEmail,
          createdAt: Date.now(),
        });

        // Transfer browser ownership to the pending OTP session.
        // The finally block below will therefore NOT close it.
        browser = null;

        this.logger.log(
          `OTP verification required for user: ${userId}`,
        );

        this.scheduleOtpSessionCleanup(userId);

        return {
          success: false,
          needsOTP: true,
          code: 'OTP_REQUIRED',
          message:
            'Naukri ne OTP bheja hai. Apna OTP enter karke verify karo.',
        };
      }

      // ─── Step 3b: CAPTCHA ───
      if (loginResult.needsCaptcha) {
        throw new BadRequestException({
          message: loginResult.error,
          code: 'CAPTCHA_DETECTED',
        });
      }

      // ─── Step 3c: Other login failure ───
      if (!loginResult.success) {
        throw new BadRequestException(loginResult.error);
      }

      // ─── Step 4: Cookies encrypt karo ───
      const cookiesJson = JSON.stringify(loginResult.cookies);
      const { encrypted, iv } = this.encryption.encrypt(cookiesJson);

      this.logger.log(
        `Encrypted ${loginResult.cookies!.length} cookies for user ${userId}`,
      );

      // ─── Step 5: DB me save karo (upsert) ───
      await this.prisma.naukriSession.upsert({
        where: { userId },
        update: {
          encryptedCookies: encrypted,
          encryptionIV: iv,
          naukriEmail: dto.naukriEmail,
          isValid: true,
          lastVerifiedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        create: {
          userId,
          encryptedCookies: encrypted,
          encryptionIV: iv,
          naukriEmail: dto.naukriEmail,
          isValid: true,
          lastVerifiedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      // ─── Step 6: Password BHUL JAO (never stored) ───
      // dto.naukriPassword ab garbage collected hoga

      return {
        message: 'Naukri successfully connect ho gaya! 🎉',
        naukriEmail: dto.naukriEmail,
        userName: loginResult.userName,
        cookiesCount: loginResult.cookies!.length,
        sessionValidUntil: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;

      this.logger.error(`Naukri connect failed: ${err.message}`);
      throw new InternalServerErrorException(
        'Naukri connect karne me error aaya. Dobara try karo.',
      );
    } finally {
      // ─── Cleanup: Browser band karo ───
      if (browser) {
        await this.browserManager.close(browser);
      }
    }
  }


  // ═══════════════════════════════════════
  // VERIFY OTP
  // ═══════════════════════════════════════
  async verifyOtp(userId: string, otp: string) {
    const pending = this.pendingOtpSessions.get(userId);

    if (!pending) {
      throw new BadRequestException({
        message:
          'OTP session nahi mila ya expire ho gaya. Naukri ko dobara connect karo.',
        code: 'OTP_SESSION_EXPIRED',
      });
    }

    if (
      Date.now() - pending.createdAt >
      this.OTP_SESSION_TIMEOUT
    ) {
      await this.closePendingOtpSession(userId);

      throw new BadRequestException({
        message:
          'OTP session expire ho gaya. Dobara Connect Naukri karo.',
        code: 'OTP_SESSION_EXPIRED',
      });
    }

    try {
      const result = await submitNaukriOtp(
        pending.page,
        otp,
      );

      if (!result.success) {
        throw new BadRequestException({
          message: result.error || 'OTP verify nahi hua.',
          code: 'OTP_INVALID',
        });
      }

      const cookies = result.cookies || [];

      if (!cookies.length) {
        throw new BadRequestException({
          message:
            'OTP verify hua, lekin Naukri session cookies nahi mili.',
          code: 'SESSION_NOT_FOUND',
        });
      }

      const response = await this.saveAuthenticatedSession(
        userId,
        pending.email,
        cookies,
        pending.email,
      );

      await this.closePendingOtpSession(userId);

      return {
        ...response,
        message:
          'Naukri OTP verified aur account successfully connect ho gaya! 🎉',
      };
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        throw err;
      }

      this.logger.error(
        `Naukri OTP verification failed: ${err.message}`,
      );

      throw new InternalServerErrorException(
        'OTP verification ke dauran error aaya. Dobara try karo.',
      );
    }
  }

  // ═══════════════════════════════════════
  // SAVE AUTHENTICATED SESSION
  // ═══════════════════════════════════════
  private async saveAuthenticatedSession(
    userId: string,
    email: string,
    cookies: any[],
    userName?: string,
  ) {
    const cookiesJson = JSON.stringify(cookies);
    const { encrypted, iv } =
      this.encryption.encrypt(cookiesJson);

    this.logger.log(
      `Encrypted ${cookies.length} Naukri cookies for user ${userId}`,
    );

    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    );

    await this.prisma.naukriSession.upsert({
      where: { userId },
      update: {
        encryptedCookies: encrypted,
        encryptionIV: iv,
        naukriEmail: email,
        isValid: true,
        lastVerifiedAt: new Date(),
        expiresAt,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      create: {
        userId,
        encryptedCookies: encrypted,
        encryptionIV: iv,
        naukriEmail: email,
        isValid: true,
        lastVerifiedAt: new Date(),
        expiresAt,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    return {
      success: true,
      naukriEmail: email,
      userName,
      cookiesCount: cookies.length,
      sessionValidUntil: expiresAt.toISOString(),
    };
  }

  // ═══════════════════════════════════════
  // OTP SESSION CLEANUP
  // ═══════════════════════════════════════
  private scheduleOtpSessionCleanup(userId: string) {
    setTimeout(async () => {
      const pending = this.pendingOtpSessions.get(userId);

      if (!pending) return;

      if (
        Date.now() - pending.createdAt >=
        this.OTP_SESSION_TIMEOUT
      ) {
        this.logger.warn(
          `OTP session expired for user: ${userId}`,
        );

        await this.closePendingOtpSession(userId);
      }
    }, this.OTP_SESSION_TIMEOUT + 1000);
  }

  private async closePendingOtpSession(userId: string) {
    const pending = this.pendingOtpSessions.get(userId);

    if (!pending) return;

    this.pendingOtpSessions.delete(userId);

    try {
      await this.browserManager.close(pending.browser);
    } catch (err: any) {
      this.logger.warn(
        `Failed to close pending OTP browser: ${err.message}`,
      );
    }
  }

  // ═══════════════════════════════════════
  // SAVE COOKIES DIRECTLY (Alternative)
  // ═══════════════════════════════════════
  async saveDirectCookies(userId: string, rawCookies: string) {
    let cookiesArray: any[] = [];

    try {
      if (rawCookies.trim().startsWith('[')) {
        cookiesArray = JSON.parse(rawCookies);
      } else {
        cookiesArray = rawCookies.split(';').map((pair) => {
          const [name, ...rest] = pair.trim().split('=');
          return {
            name,
            value: rest.join('='),
            domain: '.naukri.com',
            path: '/',
          };
        });
      }
    } catch {
      throw new BadRequestException('Cookies format invalid hai');
    }

    const { encrypted, iv } = this.encryption.encrypt(
      JSON.stringify(cookiesArray),
    );

    await this.prisma.naukriSession.upsert({
      where: { userId },
      update: {
        encryptedCookies: encrypted,
        encryptionIV: iv,
        naukriEmail: 'manual_cookie_session',
        isValid: true,
        lastVerifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      create: {
        userId,
        encryptedCookies: encrypted,
        encryptionIV: iv,
        naukriEmail: 'manual_cookie_session',
        isValid: true,
        lastVerifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      message: 'Naukri session cookies successfully save ho gayi! 🎉',
      cookiesCount: cookiesArray.length,
    };
  }


  // ═══════════════════════════════════════
  // VERIFY SESSION — Kya session valid hai?
  // ═══════════════════════════════════════
  async verifySession(userId: string) {
    const session = await this.prisma.naukriSession.findUnique({
      where: { userId },
    });

    if (!session) {
      return {
        isConnected: false,
        message: 'Naukri connect nahi hai. Pehle connect karo.',
      };
    }

    // Expiry check
    if (session.expiresAt && session.expiresAt < new Date()) {
      await this.prisma.naukriSession.update({
        where: { userId },
        data: { isValid: false },
      });

      return {
        isConnected: true,
        isValid: false,
        message: 'Session expire ho gaya. Dobara connect karo.',
        naukriEmail: session.naukriEmail,
      };
    }

    // Browser se verify karo
    let browser: any = null;

    try {
      // Decrypt cookies
      const cookiesJson = this.encryption.decrypt(
        session.encryptedCookies,
        session.encryptionIV,
      );
      const cookies = JSON.parse(cookiesJson);

      // Browser kholo with cookies
      const { browser: b, context, page } =
        await this.browserManager.createContext({
          cookies,
          userAgent: session.userAgent || undefined,
        });
      browser = b;

      // Verify karo
      const result = await verifyNaukriSession(page, context);

      // DB update karo
      await this.prisma.naukriSession.update({
        where: { userId },
        data: {
          isValid: result.valid,
          lastVerifiedAt: new Date(),
        },
      });

      return {
        isConnected: true,
        isValid: result.valid,
        naukriEmail: session.naukriEmail,
        userName: result.userName,
        lastVerified: session.lastVerifiedAt,
        expiresAt: session.expiresAt,
        message: result.valid
          ? 'Session valid hai ✅'
          : 'Session invalid ho gaya. Dobara connect karo.',
      };
    } catch (err: any) {
      this.logger.error(`Session verify failed: ${err.message}`);
      return {
        isConnected: true,
        isValid: false,
        naukriEmail: session.naukriEmail,
        message: 'Session verify nahi ho paya.',
      };
    } finally {
      if (browser) {
        await this.browserManager.close(browser);
      }
    }
  }

  // ═══════════════════════════════════════
  // DISCONNECT — Session hatao
  // ═══════════════════════════════════════
  async disconnect(userId: string) {
    await this.prisma.naukriSession.deleteMany({
      where: { userId },
    });

    return {
      message: 'Naukri disconnect ho gaya. Cookies delete ho gayi. 🔒',
    };
  }

  // ═══════════════════════════════════════
  // GET DECRYPTED COOKIES (Internal use only)
  // Worker ke liye — API pe expose mat karna!
  // ═══════════════════════════════════════
  async getDecryptedCookies(userId: string): Promise<any[] | null> {
    const session = await this.prisma.naukriSession.findUnique({
      where: { userId, isValid: true },
    });

    if (!session) return null;

    if (session.expiresAt && session.expiresAt < new Date()) return null;

    try {
      const cookiesJson = this.encryption.decrypt(
        session.encryptedCookies,
        session.encryptionIV,
      );
      return JSON.parse(cookiesJson);
    } catch {
      return null;
    }
  }

  // ═══════════════════════════════════════
  // STATUS — Quick check (no browser)
  // ═══════════════════════════════════════
  async getStatus(userId: string) {
    const session = await this.prisma.naukriSession.findUnique({
      where: { userId },
      select: {
        naukriEmail: true,
        isValid: true,
        lastVerifiedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    if (!session) {
      return { isConnected: false };
    }

    const isExpired =
      session.expiresAt && session.expiresAt < new Date();

    return {
      isConnected: true,
      isValid: session.isValid && !isExpired,
      naukriEmail: session.naukriEmail,
      lastVerified: session.lastVerifiedAt,
      expiresAt: session.expiresAt,
    };
  }
}
