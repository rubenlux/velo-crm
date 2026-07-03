import { Injectable } from '@nestjs/common';
import { SessionHistoryEntry, SessionHistoryRepository } from '../../identity/infrastructure/session-history.repository';

@Injectable()
export class ListAccessHistoryUseCase {
  constructor(private readonly sessionHistory: SessionHistoryRepository) {}

  execute(userId: string): Promise<SessionHistoryEntry[]> {
    return this.sessionHistory.listByUserId(userId);
  }
}
