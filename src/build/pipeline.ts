import { BytecodeCompiler } from '../compiler/compiler';
import { BaseNEncoder } from '../encoder/base-n';
import { XORCipher } from '../encoder/xor';
import { MultiLayerCodec } from '../encoder/codec';
import { StringProtectionEngine } from '../string-protection/engine';
import { BuildRandomizer } from './randomizer';
import { BuildGenerator } from './generator';
import { BuildConfig, CompiledChunk, CryptoKeys } from '../utils/types';
import { OpcodeDefinitions } from '../vm/opcodes';

export interface BuildResult {
  id: string;
  config: BuildConfig;
  compiledChunks: Map<string, CompiledChunk>;
  encodedBytecode: Map<string, string>;
  protectedStrings: Map<number, string>;
  outputFiles: Map<string, string>;
  timestamp: number;
}

export class BuildPipeline {
  private compiler: BytecodeCompiler;
  private randomizer: BuildRandomizer;
  private generator: BuildGenerator;
  private config: BuildConfig;

  constructor() {
    this.compiler = new BytecodeCompiler();
    this.randomizer = new BuildRandomizer();
    this.generator = new BuildGenerator();
    this.config = this.generator.generateBuildConfig();
  }

  async run(sourceCode: string): Promise<BuildResult> {
    const buildId = this.generator.generateBuildId();
    const compiledChunks = new Map<string, CompiledChunk>();
    const encodedBytecode = new Map<string, string>();
    const protectedStrings = new Map<number, string>();
    const outputFiles = new Map<string, string>();

    this.applyBuildConfig();

    const compiled = this.compiler.compileExpression(sourceCode);
    compiledChunks.set('main', compiled);

    const codec = new MultiLayerCodec({
      alphabet: this.config.alphabet,
      xorKey: this.config.xorKey,
      layers: 2,
      validate: true
    });

    const bytecodeBytes = this.serializeBytecode(compiled.instructions);
    const encoded = codec.encode(bytecodeBytes);
    encodedBytecode.set('main', encoded);

    const stringEngine = new StringProtectionEngine(
      this.config.xorKey,
      this.config.keys.aesKey,
      'xor'
    );

    for (let i = 0; i < compiled.stringPool.length; i++) {
      const encrypted = stringEngine.protectString(i, compiled.stringPool[i]);
      protectedStrings.set(i, encrypted);
    }

    outputFiles.set('main.js', this.generateOutput(buildId, encoded, protectedStrings));
    outputFiles.set('loader.js', this.generator.generateLoader());
    outputFiles.set('vm-config.json', JSON.stringify(this.serializeConfig(), null, 2));

    return {
      id: buildId,
      config: this.config,
      compiledChunks,
      encodedBytecode,
      protectedStrings,
      outputFiles,
      timestamp: Date.now()
    };
  }

  private applyBuildConfig(): void {
    OpcodeDefinitions.applyRandomizedMapping(this.config.opcodeMapping);
  }

  private serializeBytecode(instructions: any[]): Uint8Array {
    const json = JSON.stringify(instructions, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );
    return new TextEncoder().encode(json);
  }

  private generateOutput(
    buildId: string,
    encodedBytecode: string,
    protectedStrings: Map<number, string>
  ): string {
    const stringEntries = Array.from(protectedStrings.entries())
      .map(([k, v]) => `${k}:"${v}"`)
      .join(',');

    return `(function(){
const BUILD_ID="${buildId}";
const BYTECODE="${encodedBytecode}";
const STRINGS={${stringEntries}};
const KEY=[${Array.from(this.config.xorKey).join(',')}];
const ALPHABET="${this.config.alphabet}";
return {buildId:BUILD_ID,bytecode:BYTECODE,strings:STRINGS,key:KEY,alphabet:ALPHABET};
})()`;
  }

  private serializeConfig(): object {
    return {
      buildId: this.generator.generateBuildId(),
      alphabet: this.config.alphabet,
      xorKeyLength: this.config.xorKey.length,
      opcodeMappingCount: this.config.opcodeMapping.size,
      dispatcherSeed: this.config.dispatcherSeed,
      keys: {
        hmacKeyPrefix: (this.config.keys as CryptoKeys).hmacKey.substring(0, 8) + '...',
        aesKeyPrefix: (this.config.keys as CryptoKeys).aesKey.substring(0, 8) + '...',
      }
    };
  }

  async rebuild(): Promise<void> {
    this.config = this.generator.generateBuildConfig();
    OpcodeDefinitions.applyRandomizedMapping(this.config.opcodeMapping);
  }

  getConfig(): BuildConfig {
    return this.config;
  }
}
