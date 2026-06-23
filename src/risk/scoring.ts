import {
  RiskScore,
  RiskSource,
  RiskLevel,
  DetectionResult,
  ChallengeResult,
  BehavioralScore,
  IntegrityCheckResult,
  FingerprintData,
} from '../utils/types';

export class RiskScoringEngine {
  private sources: RiskSource[] = [];
  private lastScore: RiskScore | null = null;
  private history: RiskScore[] = [];
  private maxHistory: number = 100;

  calculate(params: RiskParams): RiskScore {
    this.sources = [];

    this.addDetectionScore(params.detection);
    this.addBehavioralScore(params.behavioral);
    this.addIntegrityScore(params.integrity);
    this.addChallengeScore(params.challengeResults);
    this.addFingerprintScore(params.fingerprint);
    this.addTimingScore();

    const total = this.calculateTotal();
    const level = this.determineLevel(total);

    const score: RiskScore = {
      total,
      sources: [...this.sources],
      level,
      timestamp: Date.now()
    };

    this.lastScore = score;
    this.history.push(score);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    return score;
  }

  private addDetectionScore(detection?: DetectionResult): void {
    if (!detection) return;

    const score = detection.score * 100;
    this.sources.push({
      name: 'bot_detection',
      score,
      weight: 0.25,
      details: `Confidence: ${(detection.confidence * 100).toFixed(1)}%`
    });
  }

  private addBehavioralScore(behavioral?: BehavioralScore): void {
    if (!behavioral) return;

    const riskScore = (1 - behavioral.overallScore) * 100;
    this.sources.push({
      name: 'behavioral_analysis',
      score: riskScore,
      weight: 0.15,
      details: `Human confidence: ${(behavioral.humanConfidenceScore * 100).toFixed(1)}%`
    });
  }

  private addIntegrityScore(integrity?: IntegrityCheckResult): void {
    if (!integrity) return;

    const riskScore = (1 - integrity.overallScore) * 100;
    this.sources.push({
      name: 'integrity_check',
      score: riskScore,
      weight: 0.25,
      details: `Checks passed: ${integrity.checks.filter(c => c.passed).length}/${integrity.checks.length}`
    });
  }

  private addChallengeScore(challengeResults?: ChallengeResult[]): void {
    if (!challengeResults || challengeResults.length === 0) return;

    const avgScore = challengeResults.reduce((sum, r) => sum + r.score, 0) / challengeResults.length;
    const failRate = challengeResults.filter(r => !r.passed).length / challengeResults.length;

    const riskScore = (failRate * 50) + ((100 - avgScore) * 0.5);
    this.sources.push({
      name: 'challenges',
      score: riskScore,
      weight: 0.2,
      details: `Pass rate: ${((1 - failRate) * 100).toFixed(0)}%`
    });
  }

  private addFingerprintScore(fingerprint?: FingerprintData): void {
    if (!fingerprint) return;

    let riskScore = 0;

    if (!fingerprint.canvas || fingerprint.canvas === 'no-dom' || fingerprint.canvas === 'canvas-error') {
      riskScore += 30;
    }

    if (fingerprint.webgl.renderer === 'unknown' || fingerprint.webgl.renderer === 'no-debug-info') {
      riskScore += 20;
    }

    if (fingerprint.audio === 'no-window' || fingerprint.audio === 'audio-error') {
      riskScore += 15;
    }

    this.sources.push({
      name: 'fingerprint_consistency',
      score: Math.min(100, riskScore),
      weight: 0.15,
      details: `Canvas: ${fingerprint.canvas.slice(0, 10)}...`
    });
  }

  private addTimingScore(): void {
    const now = performance.now();
    const timingRisk = Math.max(0, Math.min(100, (now % 100) / 1.5));

    this.sources.push({
      name: 'timing_analysis',
      score: timingRisk,
      weight: 0.05,
      details: `Timestamp: ${now.toFixed(0)}`
    });
  }

  private calculateTotal(): number {
    if (this.sources.length === 0) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    for (const source of this.sources) {
      weightedSum += source.score * source.weight;
      totalWeight += source.weight;
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  private determineLevel(total: number): RiskLevel {
    if (total <= 30) return 'trusted';
    if (total <= 60) return 'suspicious';
    return 'high_risk';
  }

  getLastScore(): RiskScore | null {
    return this.lastScore;
  }

  getHistory(): RiskScore[] {
    return [...this.history];
  }

  getScoreTrend(): 'improving' | 'stable' | 'degrading' {
    if (this.history.length < 3) return 'stable';

    const recent = this.history.slice(-3);
    const scores = recent.map(s => s.total);

    if (scores[2] < scores[0]) return 'improving';
    if (scores[2] > scores[0]) return 'degrading';
    return 'stable';
  }

  getRecommendation(score: RiskScore): string[] {
    const recommendations: string[] = [];

    if (score.level === 'trusted') {
      recommendations.push('Standard validation only');
    } else if (score.level === 'suspicious') {
      recommendations.push('Additional validation required');
      recommendations.push('Present challenge to client');
    } else {
      recommendations.push('Extended checks enabled');
      recommendations.push('Additional challenges required');
      recommendations.push('Server-side analysis needed');
      recommendations.push('Consider rate limiting');
    }

    return recommendations;
  }

  reset(): void {
    this.sources = [];
    this.lastScore = null;
    this.history = [];
  }
}

export interface RiskParams {
  detection?: DetectionResult;
  behavioral?: BehavioralScore;
  integrity?: IntegrityCheckResult;
  challengeResults?: ChallengeResult[];
  fingerprint?: FingerprintData;
}
