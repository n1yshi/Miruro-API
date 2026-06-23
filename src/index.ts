export { Aegis } from './core';
export type { AegisConfig } from './core';

export { VirtualMachine } from './vm/runtime';
export { Dispatcher } from './vm/dispatcher';
export { OpcodeDefinitions, OPCODES } from './vm/opcodes';

export { BytecodeCompiler } from './compiler/compiler';

export { BaseNEncoder } from './encoder/base-n';
export { XORCipher } from './encoder/xor';
export { MultiLayerCodec } from './encoder/codec';

export { StringPool } from './string-protection/pool';
export { StringProtectionEngine } from './string-protection/engine';

export { AntiBotDetection } from './detection/anti-bot';
export { BehavioralAnalyzer } from './detection/behavioral';
export { DevToolsDetector } from './detection/devtools';

export { CanvasFingerprinter } from './fingerprint/canvas';
export { WebGLFingerprinter } from './fingerprint/webgl';
export { AudioFingerprinter } from './fingerprint/audio';
export { FingerprintEngine } from './fingerprint/engine';

export { RuntimeIntegrityChecker } from './integrity/runtime';
export { SourceIntegrityVerifier } from './integrity/source';

export { ChallengeFramework } from './challenge/framework';
export { CHALLENGE_TYPES, DIFFICULTY_LEVELS } from './challenge/types';

export { SessionTrustSystem } from './session/trust';
export { TokenBinding } from './session/token';

export { RiskScoringEngine } from './risk/scoring';
export type { RiskParams } from './risk/scoring';

export { TelemetryMonitor } from './telemetry/monitor';

export { BuildPipeline } from './build/pipeline';
export type { BuildResult } from './build/pipeline';
export { BuildRandomizer } from './build/randomizer';
export { BuildGenerator } from './build/generator';

export { ServerValidator } from './server/validator';
export type { ValidationResult } from './server/validator';
export { AegisMiddleware } from './server/middleware';
export type { ServerRequest, ServerResponse, MiddlewareOptions } from './server/middleware';

export { CryptoUtils } from './utils/crypto';
export { stripComments } from './utils/strip-comments';

export type * from './utils/types';
