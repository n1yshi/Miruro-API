import {
  Challenge,
  ChallengeResponse,
  ChallengeResult,
  ChallengeType,
  Value,
} from '../utils/types';
import { CryptoUtils } from '../utils/crypto';

export class ChallengeFramework {
  private activeChallenges: Map<string, Challenge> = new Map();
  private completedChallenges: Map<string, ChallengeResult> = new Map();
  private vm: any = null;

  setVM(vmInstance: any): void {
    this.vm = vmInstance;
  }

  createChallenge(type: ChallengeType, difficulty: number = 2): Challenge {
    const challenge: Challenge = {
      challengeId: CryptoUtils.uuid(),
      timestamp: Date.now(),
      nonce: CryptoUtils.randomHex(16),
      difficulty,
      expiration: Date.now() + this.getExpirationForDifficulty(difficulty),
      challengeType: type,
      data: this.generateChallengeData(type, difficulty)
    };

    this.activeChallenges.set(challenge.challengeId, challenge);
    return challenge;
  }

  private getExpirationForDifficulty(difficulty: number): number {
    return 30000 + (difficulty * 15000);
  }

  private generateChallengeData(type: ChallengeType, difficulty: number): unknown {
    switch (type) {
      case 'hash':
        return this.generateHashChallenge(difficulty);
      case 'entropy':
        return this.generateEntropyChallenge(difficulty);
      case 'fingerprint':
        return this.generateFingerprintChallenge();
      case 'vm_execution':
        return this.generateVMChallenge(difficulty);
      case 'timing':
        return this.generateTimingChallenge(difficulty);
      default:
        return {};
    }
  }

  private generateHashChallenge(difficulty: number): object {
    const prefixLen = Math.min(5, difficulty + 1);
    const input = CryptoUtils.randomHex(16);
    const prefix = '0'.repeat(prefixLen);

    return {
      algorithm: 'SHA-256',
      input,
      expectedPrefix: prefix,
      requiredPrefix: prefix
    };
  }

  private generateEntropyChallenge(difficulty: number): object {
    return {
      sampleSize: 100 * difficulty,
      sources: ['mouse', 'keyboard', 'timing', 'audio'],
      threshold: 0.5 + (difficulty * 0.1)
    };
  }

  private generateFingerprintChallenge(): object {
    return {
      collectKeys: ['canvas', 'webgl', 'audio', 'hardware', 'display'],
      validateConsistency: true,
      requireCombined: true
    };
  }

  private generateVMChallenge(difficulty: number): object {
    const tasks: string[] = [];

    for (let i = 0; i < difficulty; i++) {
      tasks.push(`compute_fibonacci_${10 + i * 5}`);
    }

    return {
      tasks,
      maxTime: 5000,
      bytecodeId: `challenge_${CryptoUtils.randomHex(8)}`
    };
  }

  private generateTimingChallenge(difficulty: number): object {
    return {
      minTime: 100 * difficulty,
      maxTime: 1000 * difficulty,
      tolerance: 50
    };
  }

  async verifyResponse(response: ChallengeResponse): Promise<ChallengeResult> {
    const challenge = this.activeChallenges.get(response.challengeId);
    if (!challenge) {
      return {
        challengeId: response.challengeId,
        passed: false,
        score: 0,
        duration: 0
      };
    }

    if (Date.now() > challenge.expiration) {
      this.activeChallenges.delete(response.challengeId);
      return {
        challengeId: response.challengeId,
        passed: false,
        score: 0,
        duration: Date.now() - response.timestamp
      };
    }

    const passed = await this.validateSolution(challenge, response);
    const score = passed ? this.calculateScore(challenge) : 0;

    const result: ChallengeResult = {
      challengeId: response.challengeId,
      passed,
      score,
      duration: Date.now() - response.timestamp
    };

    this.activeChallenges.delete(response.challengeId);
    this.completedChallenges.set(response.challengeId, result);

    return result;
  }

  private async validateSolution(challenge: Challenge, response: ChallengeResponse): Promise<boolean> {
    switch (challenge.challengeType) {
      case 'hash':
        return this.validateHashSolution(challenge, response);
      case 'entropy':
        return this.validateEntropySolution(challenge, response);
      case 'fingerprint':
        return this.validateFingerprintSolution(challenge, response);
      case 'vm_execution':
        return this.validateVMExecutionSolution(challenge, response);
      case 'timing':
        return this.validateTimingSolution(challenge, response);
      default:
        return false;
    }
  }

  private async validateHashSolution(challenge: Challenge, response: ChallengeResponse): Promise<boolean> {
    const data = challenge.data as any;
    const nonce = response.nonce || challenge.nonce;
    const hash = await CryptoUtils.sha256(data.input + nonce);
    return hash.startsWith(data.expectedPrefix);
  }

  private async validateEntropySolution(challenge: Challenge, response: ChallengeResponse): Promise<boolean> {
    const data = challenge.data as any;
    const entropy = parseInt(response.solution, 16) / 0xFFFFFFFF;
    return entropy >= data.threshold;
  }

  private validateFingerprintSolution(challenge: Challenge, response: ChallengeResponse): Promise<boolean> {
    const solution = JSON.parse(response.solution);
    const hasRequiredKeys = challenge.challengeType === 'fingerprint';
    return Promise.resolve(hasRequiredKeys);
  }

  private validateVMExecutionSolution(challenge: Challenge, response: ChallengeResponse): Promise<boolean> {
    const data = challenge.data as any;
    const solutionValid = response.solution.length > 10;
    return Promise.resolve(solutionValid);
  }

  private validateTimingSolution(challenge: Challenge, response: ChallengeResponse): Promise<boolean> {
    const data = challenge.data as any;
    const duration = response.timestamp - challenge.timestamp;
    return Promise.resolve(duration >= data.minTime && duration <= data.maxTime);
  }

  private calculateScore(challenge: Challenge): number {
    const baseScore = 100 - (challenge.difficulty * 15);
    const timeBonus = Math.max(0, 30 - (Date.now() - challenge.timestamp) / 1000);
    return Math.min(100, baseScore + timeBonus);
  }

  getActiveChallenge(id: string): Challenge | undefined {
    return this.activeChallenges.get(id);
  }

  getCompletedChallenge(id: string): ChallengeResult | undefined {
    return this.completedChallenges.get(id);
  }

  getAllActiveChallenges(): Challenge[] {
    return Array.from(this.activeChallenges.values());
  }

  cleanup(): void {
    const now = Date.now();
    for (const [id, challenge] of this.activeChallenges) {
      if (now > challenge.expiration) {
        this.activeChallenges.delete(id);
      }
    }
  }
}
