import { VMState, Frame, Scope, Value, BytecodeInstruction, VMOptions } from '../utils/types';
import { OpcodeDefinitions } from './opcodes';
import { Dispatcher } from './dispatcher';

export class VirtualMachine {
  state: VMState;
  private instructions: BytecodeInstruction[];
  private constants: Value[];
  private stringPool: string[];
  private options: VMOptions;
  private dispatcher: Dispatcher;
  private cache: Map<number, Value> = new Map();
  private startTime: number = 0;
  private instructionCount: number = 0;

  constructor(
    instructions: BytecodeInstruction[],
    constants: Value[],
    stringPool: string[],
    options: Partial<VMOptions> = {}
  ) {
    this.instructions = instructions;
    this.constants = constants;
    this.stringPool = stringPool;
    this.options = {
      maxStackDepth: 256,
      maxInstructions: 100000,
      timeout: 5000,
      strictMode: false,
      enableAsync: false,
      enableCache: true,
      ...options
    };
    this.state = this.createInitialState();
    this.dispatcher = new Dispatcher(this);
  }

  private createInitialState(): VMState {
    const globalScope: Scope = {
      variables: new Map(),
      parent: null
    };
    return {
      ip: 0,
      stack: [],
      accumulator: { type: 'undefined' },
      currentFrame: null,
      exception: null,
      scopes: [globalScope],
      metadata: new Map(),
      running: true
    };
  }

  async execute(chunkId?: string): Promise<Value> {
    this.startTime = Date.now();
    this.instructionCount = 0;

    while (this.state.running && this.state.ip < this.instructions.length) {
      if (this.instructionCount >= this.options.maxInstructions) {
        throw new Error('VM: Maximum instruction count exceeded');
      }

      if (Date.now() - this.startTime > this.options.timeout) {
        throw new Error('VM: Execution timeout');
      }

      const instruction = this.instructions[this.state.ip];
      if (!instruction) {
        throw new Error(`VM: Invalid instruction at IP ${this.state.ip}`);
      }

      try {
        await this.dispatcher.dispatch(instruction);
      } catch (err) {
        if (this.state.exception) {
          this.state.ip++;
          continue;
        }
        throw err;
      }

      this.state.ip++;
      this.instructionCount++;
    }

    if (this.state.stack.length > 0) {
      return this.state.stack[this.state.stack.length - 1];
    }

    return { type: 'undefined' };
  }

  getState(): Readonly<VMState> {
    return this.state;
  }

  getInstructions(): BytecodeInstruction[] {
    return this.instructions;
  }

  getConstants(): Value[] {
    return this.constants;
  }

  getStringPool(): string[] {
    return this.stringPool;
  }

  push(value: Value): void {
    if (this.state.stack.length >= this.options.maxStackDepth) {
      throw new Error('VM: Stack overflow');
    }
    this.state.stack.push(value);
  }

  pop(): Value {
    const value = this.state.stack.pop();
    if (!value) {
      throw new Error('VM: Stack underflow');
    }
    return value;
  }

  peek(offset: number = 0): Value {
    const idx = this.state.stack.length - 1 - offset;
    if (idx < 0) {
      throw new Error('VM: Stack underflow (peek)');
    }
    return this.state.stack[idx];
  }

  getConstant(index: number): Value {
    if (index < 0 || index >= this.constants.length) {
      throw new Error(`VM: Invalid constant index ${index}`);
    }
    return this.constants[index];
  }

  getString(index: number): string {
    if (index < 0 || index >= this.stringPool.length) {
      throw new Error(`VM: Invalid string index ${index}`);
    }
    return this.stringPool[index];
  }

  getCurrentScope(): Scope {
    return this.state.scopes[this.state.scopes.length - 1];
  }

  pushScope(scope: Scope): void {
    this.state.scopes.push(scope);
  }

  popScope(): Scope | undefined {
    if (this.state.scopes.length > 1) {
      return this.state.scopes.pop();
    }
    return undefined;
  }

  setAccumulator(value: Value): void {
    this.state.accumulator = value;
  }

  getAccumulator(): Value {
    return this.state.accumulator;
  }

  setIP(address: number): void {
    if (address < 0 || address >= this.instructions.length) {
      throw new Error(`VM: Invalid jump target ${address}`);
    }
    this.state.ip = address;
  }

  getIP(): number {
    return this.state.ip;
  }

  setException(value: Value | null): void {
    this.state.exception = value;
  }

  getException(): Value | null {
    return this.state.exception;
  }

  halt(): void {
    this.state.running = false;
  }

  resolveValue(value: Value): unknown {
    switch (value.type) {
      case 'integer': return value.value;
      case 'float': return value.value;
      case 'string': return value.value;
      case 'boolean': return value.value;
      case 'null': return null;
      case 'undefined': return undefined;
      case 'object': return value.value;
      case 'array': return value.value.map(v => this.resolveValue(v));
      case 'function': return value.value;
      case 'reference': return this.getConstant(value.id);
      case 'promise': return value.value;
      case 'symbol': return value.value;
      case 'bigint': return value.value;
      default: return undefined;
    }
  }

  wrapValue(value: unknown): Value {
    if (value === null) return { type: 'null' };
    if (value === undefined) return { type: 'undefined' };
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return { type: 'integer', value };
      return { type: 'float', value };
    }
    if (typeof value === 'string') return { type: 'string', value };
    if (typeof value === 'boolean') return { type: 'boolean', value };
    if (typeof value === 'bigint') return { type: 'bigint', value };
    if (typeof value === 'symbol') return { type: 'symbol', value };
    if (typeof value === 'function') return { type: 'function', value };
    if (Array.isArray(value)) {
      return { type: 'array', value: value.map(v => this.wrapValue(v)) };
    }
    if (typeof value === 'object') return { type: 'object', value };
    return { type: 'undefined' };
  }

  setFrame(frame: Frame | null): void {
    this.state.currentFrame = frame;
  }

  getFrame(): Frame | null {
    return this.state.currentFrame;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCached(key: number): Value | undefined {
    if (this.options.enableCache) {
      return this.cache.get(key);
    }
    return undefined;
  }

  setCache(key: number, value: Value): void {
    if (this.options.enableCache) {
      this.cache.set(key, value);
    }
  }
}
