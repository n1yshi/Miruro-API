import { OpcodeCategory, OpcodeDefinition } from '../utils/types';

const BASE_OPCODES: { name: string; category: OpcodeCategory; operandCount: number; operandTypes: string[]; description: string }[] = [
  { name: 'NOP', category: 'control_flow', operandCount: 0, operandTypes: [], description: 'No operation' },
  { name: 'HALT', category: 'control_flow', operandCount: 0, operandTypes: [], description: 'Stop execution' },
  { name: 'JMP', category: 'control_flow', operandCount: 1, operandTypes: ['integer'], description: 'Unconditional jump' },
  { name: 'JZ', category: 'control_flow', operandCount: 1, operandTypes: ['integer'], description: 'Jump if zero' },
  { name: 'JNZ', category: 'control_flow', operandCount: 1, operandTypes: ['integer'], description: 'Jump if not zero' },
  { name: 'JE', category: 'control_flow', operandCount: 1, operandTypes: ['integer'], description: 'Jump if equal' },
  { name: 'JNE', category: 'control_flow', operandCount: 1, operandTypes: ['integer'], description: 'Jump if not equal' },
  { name: 'JG', category: 'control_flow', operandCount: 1, operandTypes: ['integer'], description: 'Jump if greater' },
  { name: 'JL', category: 'control_flow', operandCount: 1, operandTypes: ['integer'], description: 'Jump if less' },
  { name: 'JGE', category: 'control_flow', operandCount: 1, operandTypes: ['integer'], description: 'Jump if greater or equal' },
  { name: 'JLE', category: 'control_flow', operandCount: 1, operandTypes: ['integer'], description: 'Jump if less or equal' },
  { name: 'CALL', category: 'functions', operandCount: 2, operandTypes: ['integer', 'integer'], description: 'Call function at address' },
  { name: 'RET', category: 'functions', operandCount: 0, operandTypes: [], description: 'Return from function' },
  { name: 'CALL_NATIVE', category: 'functions', operandCount: 1, operandTypes: ['integer'], description: 'Call native function' },
  { name: 'APPLY', category: 'functions', operandCount: 1, operandTypes: ['integer'], description: 'Apply function with args' },
  { name: 'CONSTRUCT', category: 'functions', operandCount: 1, operandTypes: ['integer'], description: 'Construct new instance' },
  { name: 'ADD', category: 'arithmetic', operandCount: 0, operandTypes: [], description: 'Add top two stack values' },
  { name: 'SUB', category: 'arithmetic', operandCount: 0, operandTypes: [], description: 'Subtract top two stack values' },
  { name: 'MUL', category: 'arithmetic', operandCount: 0, operandTypes: [], description: 'Multiply top two stack values' },
  { name: 'DIV', category: 'arithmetic', operandCount: 0, operandTypes: [], description: 'Divide top two stack values' },
  { name: 'MOD', category: 'arithmetic', operandCount: 0, operandTypes: [], description: 'Modulo top two stack values' },
  { name: 'POW', category: 'arithmetic', operandCount: 0, operandTypes: [], description: 'Exponentiation' },
  { name: 'NEG', category: 'arithmetic', operandCount: 0, operandTypes: [], description: 'Negate top value' },
  { name: 'INC', category: 'arithmetic', operandCount: 0, operandTypes: [], description: 'Increment top value' },
  { name: 'DEC', category: 'arithmetic', operandCount: 0, operandTypes: [], description: 'Decrement top value' },
  { name: 'AND', category: 'bitwise', operandCount: 0, operandTypes: [], description: 'Bitwise AND' },
  { name: 'OR', category: 'bitwise', operandCount: 0, operandTypes: [], description: 'Bitwise OR' },
  { name: 'XOR', category: 'bitwise', operandCount: 0, operandTypes: [], description: 'Bitwise XOR' },
  { name: 'SHL', category: 'bitwise', operandCount: 0, operandTypes: [], description: 'Bitwise shift left' },
  { name: 'SHR', category: 'bitwise', operandCount: 0, operandTypes: [], description: 'Bitwise shift right' },
  { name: 'NOT', category: 'bitwise', operandCount: 0, operandTypes: [], description: 'Bitwise NOT' },
  { name: 'EQ', category: 'comparison', operandCount: 0, operandTypes: [], description: 'Abstract equality (==)' },
  { name: 'SEQ', category: 'comparison', operandCount: 0, operandTypes: [], description: 'Strict equality (===)' },
  { name: 'NEQ', category: 'comparison', operandCount: 0, operandTypes: [], description: 'Abstract inequality (!=)' },
  { name: 'SNEQ', category: 'comparison', operandCount: 0, operandTypes: [], description: 'Strict inequality (!==)' },
  { name: 'LT', category: 'comparison', operandCount: 0, operandTypes: [], description: 'Less than' },
  { name: 'GT', category: 'comparison', operandCount: 0, operandTypes: [], description: 'Greater than' },
  { name: 'LTE', category: 'comparison', operandCount: 0, operandTypes: [], description: 'Less than or equal' },
  { name: 'GTE', category: 'comparison', operandCount: 0, operandTypes: [], description: 'Greater than or equal' },
  { name: 'IN', category: 'comparison', operandCount: 0, operandTypes: [], description: 'Check property existence' },
  { name: 'INSTANCEOF', category: 'comparison', operandCount: 0, operandTypes: [], description: 'Check instanceof' },
  { name: 'DECLARE', category: 'variables', operandCount: 1, operandTypes: ['string'], description: 'Declare variable' },
  { name: 'LOAD', category: 'variables', operandCount: 1, operandTypes: ['string'], description: 'Load variable onto stack' },
  { name: 'STORE', category: 'variables', operandCount: 1, operandTypes: ['string'], description: 'Store stack top to variable' },
  { name: 'LD_GLOBAL', category: 'variables', operandCount: 1, operandTypes: ['string'], description: 'Load global variable' },
  { name: 'ST_GLOBAL', category: 'variables', operandCount: 1, operandTypes: ['string'], description: 'Store to global variable' },
  { name: 'LD_SCOPE', category: 'variables', operandCount: 2, operandTypes: ['integer', 'string'], description: 'Load from scope chain' },
  { name: 'ST_SCOPE', category: 'variables', operandCount: 2, operandTypes: ['integer', 'string'], description: 'Store to scope chain' },
  { name: 'PUSH', category: 'stack', operandCount: 1, operandTypes: ['integer'], description: 'Push constant index' },
  { name: 'PUSH_I', category: 'stack', operandCount: 1, operandTypes: ['integer'], description: 'Push integer literal' },
  { name: 'PUSH_F', category: 'stack', operandCount: 1, operandTypes: ['float'], description: 'Push float literal' },
  { name: 'PUSH_S', category: 'stack', operandCount: 1, operandTypes: ['string'], description: 'Push string literal' },
  { name: 'PUSH_B', category: 'stack', operandCount: 1, operandTypes: ['boolean'], description: 'Push boolean literal' },
  { name: 'PUSH_NULL', category: 'stack', operandCount: 0, operandTypes: [], description: 'Push null' },
  { name: 'PUSH_UNDEF', category: 'stack', operandCount: 0, operandTypes: [], description: 'Push undefined' },
  { name: 'POP', category: 'stack', operandCount: 0, operandTypes: [], description: 'Pop from stack' },
  { name: 'DUP', category: 'stack', operandCount: 0, operandTypes: [], description: 'Duplicate top of stack' },
  { name: 'SWAP', category: 'stack', operandCount: 0, operandTypes: [], description: 'Swap top two values' },
  { name: 'CREATE_OBJ', category: 'objects', operandCount: 1, operandTypes: ['integer'], description: 'Create object with n properties' },
  { name: 'CREATE_ARR', category: 'objects', operandCount: 1, operandTypes: ['integer'], description: 'Create array with n elements' },
  { name: 'PROP_GET', category: 'objects', operandCount: 1, operandTypes: ['string'], description: 'Get property by name' },
  { name: 'PROP_SET', category: 'objects', operandCount: 1, operandTypes: ['string'], description: 'Set property by name' },
  { name: 'PROP_DEL', category: 'objects', operandCount: 1, operandTypes: ['string'], description: 'Delete property' },
  { name: 'PROP_GET_DYN', category: 'objects', operandCount: 0, operandTypes: [], description: 'Get property dynamically' },
  { name: 'PROP_SET_DYN', category: 'objects', operandCount: 0, operandTypes: [], description: 'Set property dynamically' },
  { name: 'IDX_GET', category: 'objects', operandCount: 0, operandTypes: [], description: 'Get index from array' },
  { name: 'IDX_SET', category: 'objects', operandCount: 0, operandTypes: [], description: 'Set index in array' },
  { name: 'TYPEOF', category: 'objects', operandCount: 0, operandTypes: [], description: 'Typeof operator' },
  { name: 'DELETE', category: 'objects', operandCount: 0, operandTypes: [], description: 'Delete operator' },
  { name: 'TRY', category: 'exceptions', operandCount: 2, operandTypes: ['integer', 'integer'], description: 'Start try block' },
  { name: 'CATCH', category: 'exceptions', operandCount: 1, operandTypes: ['string'], description: 'Catch exception' },
  { name: 'FINALLY', category: 'exceptions', operandCount: 1, operandTypes: ['integer'], description: 'Finally block' },
  { name: 'THROW', category: 'exceptions', operandCount: 0, operandTypes: [], description: 'Throw exception' },
  { name: 'END_TRY', category: 'exceptions', operandCount: 0, operandTypes: [], description: 'End try block' },
  { name: 'NEW_SCOPE', category: 'variables', operandCount: 0, operandTypes: [], description: 'Create new scope' },
  { name: 'POP_SCOPE', category: 'variables', operandCount: 0, operandTypes: [], description: 'Pop current scope' },
  { name: 'CREATE_CLOSURE', category: 'functions', operandCount: 2, operandTypes: ['integer', 'integer'], description: 'Create closure' },
  { name: 'BIND_THIS', category: 'functions', operandCount: 0, operandTypes: [], description: 'Bind this value' },
  { name: 'MAKE_PROMISE', category: 'builtins', operandCount: 1, operandTypes: ['integer'], description: 'Create promise' },
  { name: 'AWAIT', category: 'builtins', operandCount: 0, operandTypes: [], description: 'Await promise' },
  { name: 'RESOLVE', category: 'builtins', operandCount: 0, operandTypes: [], description: 'Resolve promise' },
  { name: 'REJECT', category: 'builtins', operandCount: 0, operandTypes: [], description: 'Reject promise' },
  { name: 'NEW_REGEX', category: 'builtins', operandCount: 2, operandTypes: ['string', 'string'], description: 'Create RegExp' },
  { name: 'CRYPTO_RANDOM', category: 'builtins', operandCount: 0, operandTypes: [], description: 'Generate random bytes' },
  { name: 'TYPE_CONVERT', category: 'stack', operandCount: 1, operandTypes: ['string'], description: 'Convert type' },
  { name: 'DEBUGGER', category: 'builtins', operandCount: 0, operandTypes: [], description: 'Debugger statement' },
  { name: 'BREAKPOINT', category: 'builtins', operandCount: 0, operandTypes: [], description: 'Anti-debug breakpoint' },
  { name: 'EVAL_EXPR', category: 'builtins', operandCount: 1, operandTypes: ['string'], description: 'Evaluate expression safely' },
  { name: 'CONCAT', category: 'arithmetic', operandCount: 0, operandTypes: [], description: 'String concatenation' },
  { name: 'LENGTH', category: 'objects', operandCount: 0, operandTypes: [], description: 'Get array/string length' },
  { name: 'ITERATE', category: 'control_flow', operandCount: 2, operandTypes: ['integer', 'integer'], description: 'Iterate with counter' },
  { name: 'FOR_IN', category: 'control_flow', operandCount: 1, operandTypes: ['integer'], description: 'For-in loop' },
  { name: 'FOR_OF', category: 'control_flow', operandCount: 1, operandTypes: ['integer'], description: 'For-of loop' },
];

export class OpcodeDefinitions {
  private static mapping: Map<number, OpcodeDefinition> = new Map();
  private static reverseMapping: Map<string, number> = new Map();
  private static randomizedMapping: Map<number, number> | null = null;

  static initialize(): void {
    BASE_OPCODES.forEach((op, index) => {
      const def: OpcodeDefinition = { ...op, id: index };
      this.mapping.set(index, def);
      this.reverseMapping.set(op.name, index);
    });
  }

  static get(id: number): OpcodeDefinition | undefined {
    const realId = this.randomizedMapping?.get(id) ?? id;
    return this.mapping.get(realId);
  }

  static getByName(name: string): number | undefined {
    return this.reverseMapping.get(name);
  }

  static applyRandomizedMapping(mapping: Map<number, number>): void {
    this.randomizedMapping = mapping;
  }

  static getAllDefinitions(): OpcodeDefinition[] {
    return Array.from(this.mapping.values());
  }

  static getCount(): number {
    return this.mapping.size;
  }

  static getCategoryCounts(): Record<OpcodeCategory, number> {
    const counts: Record<string, number> = {};
    this.mapping.forEach(def => {
      counts[def.category] = (counts[def.category] || 0) + 1;
    });
    return counts as Record<OpcodeCategory, number>;
  }
}

OpcodeDefinitions.initialize();

export const OPCODES = {
  NOP: 0, HALT: 1, JMP: 2, JZ: 3, JNZ: 4, JE: 5, JNE: 6, JG: 7, JL: 8,
  JGE: 9, JLE: 10, CALL: 11, RET: 12, CALL_NATIVE: 13, APPLY: 14, CONSTRUCT: 15,
  ADD: 16, SUB: 17, MUL: 18, DIV: 19, MOD: 20, POW: 21, NEG: 22, INC: 23, DEC: 24,
  AND: 25, OR: 26, XOR: 27, SHL: 28, SHR: 29, NOT: 30,
  EQ: 31, SEQ: 32, NEQ: 33, SNEQ: 34, LT: 35, GT: 36, LTE: 37, GTE: 38, IN: 39, INSTANCEOF: 40,
  DECLARE: 41, LOAD: 42, STORE: 43, LD_GLOBAL: 44, ST_GLOBAL: 45, LD_SCOPE: 46, ST_SCOPE: 47,
  PUSH: 48, PUSH_I: 49, PUSH_F: 50, PUSH_S: 51, PUSH_B: 52, PUSH_NULL: 53, PUSH_UNDEF: 54,
  POP: 55, DUP: 56, SWAP: 57,
  CREATE_OBJ: 58, CREATE_ARR: 59, PROP_GET: 60, PROP_SET: 61, PROP_DEL: 62,
  PROP_GET_DYN: 63, PROP_SET_DYN: 64, IDX_GET: 65, IDX_SET: 66, TYPEOF: 67, DELETE: 68,
  TRY: 69, CATCH: 70, FINALLY: 71, THROW: 72, END_TRY: 73,
  NEW_SCOPE: 74, POP_SCOPE: 75, CREATE_CLOSURE: 76, BIND_THIS: 77,
  MAKE_PROMISE: 78, AWAIT: 79, RESOLVE: 80, REJECT: 81,
  NEW_REGEX: 82, CRYPTO_RANDOM: 83,
  TYPE_CONVERT: 84, DEBUGGER: 85, BREAKPOINT: 86, EVAL_EXPR: 87,
  CONCAT: 88, LENGTH: 89, ITERATE: 90, FOR_IN: 91, FOR_OF: 92,
} as const;
