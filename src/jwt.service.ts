// jwt.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthService {
  constructor(private readonly jwtService: JwtService) {}

  async signPayload(payload: any): Promise<string> {
    Logger.log('Payload before signing:', payload);
    // delete payload.timeZone
    return this.jwtService.sign(JSON.parse(JSON.stringify( payload)));
  }

  async verifyToken(token: string): Promise<any> {
    return this.jwtService.verify(token);
  }
}
