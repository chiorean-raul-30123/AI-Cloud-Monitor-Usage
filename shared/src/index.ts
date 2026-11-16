export type ProviderId = 'OPENAI' | 'ANTHROPIC' | 'AWS' | 'AWS_CREDITS';
export interface ProviderSnapshot { provider: ProviderId; periodStart: string; periodEnd: string; updatedAt: string; isCached: boolean; stale: boolean; }
