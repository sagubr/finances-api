import type { SessionResolver } from "../session-resolver.js";

export class GetCurrentSessionUseCase {
  constructor(private readonly sessionResolver: SessionResolver) {}

  async execute(token: string) {
    return this.sessionResolver.resolve(token);
  }
}
