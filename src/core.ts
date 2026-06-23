import { VirtualMachine } from './vm/runtime';
import { OpcodeDefinitions } from './vm/opcodes';
import { BytecodeCompiler } from './compiler/compiler';
import { MultiLayerCodec } from './encoder/codec';
import { BaseNEncoder } from './encoder/base-n';
import { XORCipher } from './encoder/xor';
import { StringProtectionEngine } from './string-protection/engine';
import { AntiBotDetection } from './detection/anti-bot';
import { BehavioralAnalyzer } from './detection/behavioral';
import { DevToolsDetector } from './detection/devtools';
import { FingerprintEngine } from './fingerprint/engine';
import { RuntimeIntegrityChecker } from './integrity/runtime';
import { SourceIntegrityVerifier } from './integrity/source';
import { ChallengeFramework } from './challenge/framework';
import { SessionTrustSystem } from './session/trust';
import { RiskScoringEngine } from './risk/scoring';
import { TelemetryMonitor } from './telemetry/monitor';
import { BuildPipeline } from './build/pipeline';
import { CryptoUtils } from './utils/crypto';
import { stripComments } from './utils/strip-comments';

import type {
  BytecodeInstruction,
  Value,
  CompiledChunk,
  DetectionResult,
  FingerprintData,
  IntegrityCheckResult,
  Challenge,
  ChallengeResponse,
  ChallengeResult,
  SessionTrustToken,
  RequestValidationToken,
  RiskScore,
  BehavioralScore,
  TelemetryEvent,
} from './utils/types';

export interface AegisConfig {
  apiKey?: string;
  vmTimeout?: number;
  maxInstructions?: number;
  enableTelemetry?: boolean;
  enableBehavioralAnalysis?: boolean;
  fingerprintCache?: boolean;
  challengeDifficulty?: number;
}

export class Aegis {
  public vm!: VirtualMachine;
  public compiler: BytecodeCompiler;
  public codec!: MultiLayerCodec;
  public stringProtection: StringProtectionEngine;
  public antiBot: AntiBotDetection;
  public behavioral: BehavioralAnalyzer;
  public devTools: DevToolsDetector;
  public fingerprint: FingerprintEngine;
  public integrity: RuntimeIntegrityChecker;
  public sourceIntegrity: SourceIntegrityVerifier;
  public challenge: ChallengeFramework;
  public session: SessionTrustSystem;
  public risk: RiskScoringEngine;
  public telemetry: TelemetryMonitor;
  public build: BuildPipeline;

  private config: AegisConfig;
  private initialized: boolean = false;
  private version: string = '1.0.0';

  constructor(config: AegisConfig = {}) {
    this.config = {
      apiKey: CryptoUtils.randomHex(32),
      vmTimeout: 5000,
      maxInstructions: 100000,
      enableTelemetry: true,
      enableBehavioralAnalysis: true,
      fingerprintCache: true,
      challengeDifficulty: 2,
      ...config
    };

    this.compiler = new BytecodeCompiler();
    this.stringProtection = new StringProtectionEngine();
    this.antiBot = new AntiBotDetection();
    this.behavioral = new BehavioralAnalyzer();
    this.devTools = new DevToolsDetector();
    this.fingerprint = new FingerprintEngine();
    this.integrity = new RuntimeIntegrityChecker();
    this.sourceIntegrity = new SourceIntegrityVerifier();
    this.challenge = new ChallengeFramework();
    this.session = new SessionTrustSystem(this.config.apiKey);
    this.risk = new RiskScoringEngine();
    this.telemetry = new TelemetryMonitor({
      enabled: this.config.enableTelemetry,
      gdprCompliant: true
    });
    this.build = new BuildPipeline();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    OpcodeDefinitions.initialize();
    this.initialized = true;

    this.telemetry.track('vm_event', { action: 'initialized', version: this.version }, 'info');
  }

  async executeBytecode(
    instructions: BytecodeInstruction[],
    constants: Value[] = [],
    stringPool: string[] = []
  ): Promise<Value> {
    this.ensureInitialized();

    this.vm = new VirtualMachine(instructions, constants, stringPool, {
      timeout: this.config.vmTimeout,
      maxInstructions: this.config.maxInstructions
    });

    this.challenge.setVM(this.vm);

    try {
      const result = await this.vm.execute();
      this.telemetry.track('vm_event', { action: 'execution_complete', instructionCount: this.vm['instructionCount'] }, 'info');
      return result;
    } catch (err) {
      this.telemetry.trackRuntimeError(
        err instanceof Error ? err.message : String(err),
        'vm_execution'
      );
      throw err;
    }
  }

  compileExpression(expression: string): CompiledChunk {
    this.ensureInitialized();
    return this.compiler.compileExpression(expression);
  }

  detectAutomation(): DetectionResult {
    this.ensureInitialized();
    return this.antiBot.detect();
  }

  startBehavioralAnalysis(): void {
    if (this.config.enableBehavioralAnalysis) {
      this.behavioral.startCollection();
    }
  }

  stopBehavioralAnalysis(): void {
    this.behavioral.stopCollection();
  }

  getBehavioralScore(): BehavioralScore {
    return this.behavioral.analyze();
  }

  generateFingerprint(): FingerprintData {
    return this.fingerprint.generate();
  }

  checkIntegrity(): IntegrityCheckResult {
    return this.integrity.verify();
  }

  createChallenge(type: Challenge['challengeType'], difficulty?: number): Challenge {
    this.ensureInitialized();
    return this.challenge.createChallenge(type, difficulty ?? this.config.challengeDifficulty ?? 2);
  }

  async verifyChallenge(response: ChallengeResponse): Promise<ChallengeResult> {
    return this.challenge.verifyResponse(response);
  }

  async createSession(): Promise<SessionTrustToken> {
    this.ensureInitialized();
    const fp = this.fingerprint.generate();
    return this.session.createSession(fp.combined, this.version);
  }

  async createRequestToken(challengeResults: ChallengeResult[]): Promise<RequestValidationToken> {
    return this.session.createRequestToken(challengeResults);
  }

  calculateRisk(params: {
    detection?: DetectionResult;
    behavioral?: BehavioralScore;
    integrity?: IntegrityCheckResult;
    challengeResults?: ChallengeResult[];
    fingerprint?: FingerprintData;
  }): RiskScore {
    return this.risk.calculate(params);
  }

  detectDevTools(): { detected: boolean; confidence: number; methods: string[] } {
    return this.devTools.detect();
  }

  async runBuild(sourceCode: string) {
    return this.build!.run(sourceCode);
  }

  getTelemetryEvents(): TelemetryEvent[] {
    return this.telemetry.getEvents();
  }

  protectString(id: number, value: string): string {
    return this.stringProtection.protectString(id, value);
  }

  revealString(id: number): string {
    return this.stringProtection.revealString(id);
  }

  getVersion(): string {
    return this.version;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Aegis not initialized. Call initialize() first.');
    }
  }

  async runProtectedCode(code: string): Promise<Value> {
    const cleaned = this.stripComments(code);
    const compiled = this.compileExpression(cleaned);
    return this.executeBytecode(compiled.instructions, compiled.constants, compiled.stringPool);
  }

  stripComments(code: string): string {
    return stripComments(code);
  }

  dispose(): void {
    this.telemetry.destroy();
    this.behavioral.stopCollection();
    this.fingerprint.clearCache();
    this.risk.reset();
  }
}
