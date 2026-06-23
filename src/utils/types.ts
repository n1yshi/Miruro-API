export interface VMState {
  ip: number;
  stack: Value[];
  accumulator: Value;
  currentFrame: Frame | null;
  exception: Value | null;
  scopes: Scope[];
  metadata: Map<string, unknown>;
  running: boolean;
}

export interface Frame {
  thisValue: unknown;
  locals: Map<string, Value>;
  parentScope: Scope;
  returnAddress: number;
  closureData: Map<string, Value>;
  metadata: Map<string, unknown>;
}

export interface Scope {
  variables: Map<string, Value>;
  parent: Scope | null;
}

export type Value =
  | { type: 'integer'; value: number }
  | { type: 'float'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'null' }
  | { type: 'undefined' }
  | { type: 'object'; value: object }
  | { type: 'array'; value: Value[] }
  | { type: 'function'; value: CallableFunction }
  | { type: 'reference'; id: number }
  | { type: 'promise'; value: Promise<Value> }
  | { type: 'symbol'; value: symbol }
  | { type: 'bigint'; value: bigint };

export interface BytecodeInstruction {
  opcode: number;
  operands: (number | string | boolean | object)[];
  line?: number;
}

export interface CompiledChunk {
  instructions: BytecodeInstruction[];
  constants: Value[];
  stringPool: string[];
  sourceMap?: Map<number, number>;
}

export interface Challenge {
  challengeId: string;
  timestamp: number;
  nonce: string;
  difficulty: number;
  expiration: number;
  challengeType: ChallengeType;
  data?: unknown;
}

export interface ChallengeResponse {
  challengeId: string;
  solution: string;
  timestamp: number;
  nonce?: string;
  executionMetrics: ExecutionMetrics;
}

export type ChallengeType =
  | 'hash'
  | 'entropy'
  | 'fingerprint'
  | 'vm_execution'
  | 'timing';

export interface ExecutionMetrics {
  duration: number;
  memoryUsage?: number;
  integrityStatus: IntegrityStatus;
  vmVersion: string;
}

export type IntegrityStatus = 'clean' | 'compromised' | 'unknown';

export interface SessionTrustToken {
  sessionId: string;
  fingerprintHash: string;
  vmVersion: string;
  integrityStatus: IntegrityStatus;
  issuedAt: number;
  expiresAt: number;
  signature?: string;
}

export interface RequestValidationToken {
  requestId: string;
  challengeResults: ChallengeResult[];
  timestamp: number;
  nonce: string;
  signature?: string;
}

export interface ChallengeResult {
  challengeId: string;
  passed: boolean;
  score: number;
  duration: number;
}

export interface RiskScore {
  total: number;
  sources: RiskSource[];
  level: RiskLevel;
  timestamp: number;
}

export type RiskLevel = 'trusted' | 'suspicious' | 'high_risk';

export interface RiskSource {
  name: string;
  score: number;
  weight: number;
  details?: string;
}

export interface FingerprintData {
  canvas: string;
  webgl: WebGLFingerprint;
  audio: string;
  hardware: HardwareFingerprint;
  display: DisplayFingerprint;
  environment: EnvironmentFingerprint;
  combined: string;
}

export interface WebGLFingerprint {
  renderer: string;
  vendor: string;
  version: string;
  shadingLanguageVersion: string;
}

export interface HardwareFingerprint {
  cpuCores: number;
  memoryMB: number | null;
  hardwareConcurrency: number;
  deviceMemory: number | null;
}

export interface DisplayFingerprint {
  width: number;
  height: number;
  colorDepth: number;
  pixelDepth: number;
  availWidth: number;
  availHeight: number;
}

export interface EnvironmentFingerprint {
  timezone: string;
  timezoneOffset: number;
  locale: string;
  languages: string[];
  platform: string;
  userAgent: string;
}

export interface TelemetryEvent {
  id: string;
  type: TelemetryEventType;
  timestamp: number;
  data: Record<string, unknown>;
  level: 'info' | 'warning' | 'error' | 'critical';
}

export type TelemetryEventType =
  | 'integrity_violation'
  | 'challenge_completed'
  | 'challenge_failed'
  | 'runtime_error'
  | 'vm_event'
  | 'risk_score_change'
  | 'fingerprint_change'
  | 'session_created'
  | 'session_expired'
  | 'detection_triggered';

export interface BuildConfig {
  keys: CryptoKeys;
  opcodeMapping: Map<number, number>;
  alphabet: string;
  xorKey: Uint8Array;
  dispatcherSeed: number;
}

export interface CryptoKeys {
  hmacKey: string;
  aesKey: string;
  signatureKey: string;
}

export type OpcodeCategory =
  | 'control_flow'
  | 'arithmetic'
  | 'bitwise'
  | 'comparison'
  | 'variables'
  | 'objects'
  | 'functions'
  | 'exceptions'
  | 'builtins'
  | 'stack'
  | 'memory';

export interface OpcodeDefinition {
  id: number;
  name: string;
  category: OpcodeCategory;
  operandCount: number;
  operandTypes: string[];
  description: string;
}

export interface VMOptions {
  maxStackDepth: number;
  maxInstructions: number;
  timeout: number;
  strictMode: boolean;
  enableAsync: boolean;
  enableCache: boolean;
}

export interface CompilerOptions {
  optimize: boolean;
  sourceMap: boolean;
  targetVersion: string;
  inlineConstants: boolean;
}

export interface EncoderOptions {
  alphabet: string;
  xorKey: Uint8Array;
  layers: number;
  validate: boolean;
}

export interface DetectionResult {
  isAutomated: boolean;
  confidence: number;
  signals: DetectionSignal[];
  score: number;
}

export interface DetectionSignal {
  name: string;
  detected: boolean;
  value: unknown;
  weight: number;
}

export interface BehavioralData {
  mouseMovements: MouseEventData[];
  scrollPatterns: ScrollEventData[];
  keyPresses: KeyEventData[];
  touchEvents: TouchEventData[];
  focusChanges: FocusEventData[];
}

export interface MouseEventData {
  x: number;
  y: number;
  timestamp: number;
  velocity: number;
  acceleration: number;
}

export interface ScrollEventData {
  scrollX: number;
  scrollY: number;
  timestamp: number;
}

export interface KeyEventData {
  key: string;
  timestamp: number;
  duration: number;
}

export interface TouchEventData {
  x: number;
  y: number;
  force: number;
  timestamp: number;
}

export interface FocusEventData {
  type: 'focus' | 'blur';
  timestamp: number;
}

export interface BehavioralScore {
  interactionScore: number;
  humanConfidenceScore: number;
  consistencyScore: number;
  overallScore: number;
}

export interface IntegrityCheckResult {
  passed: boolean;
  checks: IntegrityCheck[];
  overallScore: number;
  timestamp: number;
}

export interface IntegrityCheck {
  name: string;
  passed: boolean;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RequestHeaders {
  'X-Client-Session': string;
  'X-Client-Request': string;
  'X-Client-Signature': string;
  'X-Client-Version': string;
  'X-Request-ID': string;
}
