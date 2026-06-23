import {
  BytecodeInstruction,
  Value,
  CompiledChunk,
  CompilerOptions,
} from '../utils/types';
import { OPCODES } from '../vm/opcodes';

type ASTNode = {
  type: string;
  [key: string]: unknown;
};

export class BytecodeCompiler {
  private instructions: BytecodeInstruction[] = [];
  private constants: Value[] = [];
  private stringPool: string[] = [];
  private stringIndex: Map<string, number> = new Map();
  private constantIndex: Map<string, number> = new Map();
  private labelMap: Map<string, number> = new Map();
  private options: CompilerOptions;

  constructor(options: Partial<CompilerOptions> = {}) {
    this.options = {
      optimize: true,
      sourceMap: true,
      targetVersion: '1.0',
      inlineConstants: false,
      ...options
    };
  }

  compile(ast: ASTNode[]): CompiledChunk {
    this.instructions = [];
    this.constants = [];
    this.stringPool = [];
    this.stringIndex.clear();
    this.constantIndex.clear();
    this.labelMap.clear();

    for (const node of ast) {
      this.compileNode(node);
    }

    return {
      instructions: this.instructions,
      constants: this.constants,
      stringPool: this.stringPool,
      sourceMap: this.options.sourceMap ? new Map() : undefined
    };
  }

  compileExpression(expr: string): CompiledChunk {
    const tokens = this.tokenize(expr);
    const ast = this.parse(tokens);
    return this.compile(ast);
  }

  private compileNode(node: ASTNode): void {
    switch (node.type) {
      case 'Program':
        this.compileProgram(node);
        break;
      case 'FunctionDeclaration':
        this.compileFunction(node);
        break;
      case 'VariableDeclaration':
        this.compileVariableDeclaration(node);
        break;
      case 'Assignment':
        this.compileAssignment(node);
        break;
      case 'BinaryExpression':
        this.compileBinaryExpression(node);
        break;
      case 'UnaryExpression':
        this.compileUnaryExpression(node);
        break;
      case 'Literal':
        this.compileLiteral(node);
        break;
      case 'Identifier':
        this.compileIdentifier(node);
        break;
      case 'CallExpression':
        this.compileCallExpression(node);
        break;
      case 'MemberExpression':
        this.compileMemberExpression(node);
        break;
      case 'ArrayExpression':
        this.compileArrayExpression(node);
        break;
      case 'ObjectExpression':
        this.compileObjectExpression(node);
        break;
      case 'ConditionalExpression':
        this.compileConditional(node);
        break;
      case 'BlockStatement':
        this.compileBlock(node);
        break;
      case 'IfStatement':
        this.compileIfStatement(node);
        break;
      case 'WhileStatement':
        this.compileWhileStatement(node);
        break;
      case 'ForStatement':
        this.compileForStatement(node);
        break;
      case 'ReturnStatement':
        this.compileReturnStatement(node);
        break;
      case 'TryStatement':
        this.compileTryStatement(node);
        break;
      case 'ThrowStatement':
        this.compileThrowStatement(node);
        break;
      case 'BreakStatement':
        this.emit(OPCODES.JMP, [this.labelMap.get('_break_target') ?? 0]);
        break;
      case 'ContinueStatement':
        this.emit(OPCODES.JMP, [this.labelMap.get('_continue_target') ?? 0]);
        break;
      default:
        if (node.type.endsWith('Expression')) {
          this.compileExpressionNode(node);
        }
    }
  }

  private compileProgram(node: ASTNode): void {
    const body = node.body as ASTNode[] || [];
    for (const stmt of body) {
      this.compileNode(stmt);
    }
  }

  private compileFunction(node: ASTNode): void {
    const params = node.params as ASTNode[] || [];
    const body = node.body as ASTNode[] || [];
    const name = node.name as string || 'anonymous';

    this.emit(OPCODES.NEW_SCOPE);
    for (const param of params) {
      if (param.type === 'Identifier') {
        this.emit(OPCODES.DECLARE, [param.name as string]);
        this.emit(OPCODES.STORE, [param.name as string]);
      }
    }
    for (const stmt of body) {
      this.compileNode(stmt);
    }
    this.emit(OPCODES.POP_SCOPE);
    this.emit(OPCODES.RET);
  }

  private compileVariableDeclaration(node: ASTNode): void {
    const declarations = node.declarations as ASTNode[] || [];
    for (const decl of declarations) {
      const name = decl.name as string;
      this.emit(OPCODES.DECLARE, [name]);
      if (decl.init != null) {
        this.compileNode(decl.init as ASTNode);
        this.emit(OPCODES.STORE, [name]);
      }
    }
  }

  private compileAssignment(node: ASTNode): void {
    const target = node.target as ASTNode;
    const value = node.value as ASTNode;
    this.compileNode(value);
    if (target.type === 'Identifier') {
      this.emit(OPCODES.STORE, [target.name as string]);
    } else if (target.type === 'MemberExpression') {
      this.compileNode(target.object as ASTNode);
      this.emit(OPCODES.PUSH_S, [target.property as string]);
      this.emit(OPCODES.PROP_SET_DYN);
    }
  }

  private compileBinaryExpression(node: ASTNode): void {
    const op = node.operator as string;
    const left = node.left as ASTNode;
    const right = node.right as ASTNode;

    this.compileNode(left);
    this.compileNode(right);

    const opMap: Record<string, number> = {
      '+': OPCODES.ADD,
      '-': OPCODES.SUB,
      '*': OPCODES.MUL,
      '/': OPCODES.DIV,
      '%': OPCODES.MOD,
      '**': OPCODES.POW,
      '&': OPCODES.AND,
      '|': OPCODES.OR,
      '^': OPCODES.XOR,
      '<<': OPCODES.SHL,
      '>>': OPCODES.SHR,
      '==': OPCODES.EQ,
      '===': OPCODES.SEQ,
      '!=': OPCODES.NEQ,
      '!==': OPCODES.SNEQ,
      '<': OPCODES.LT,
      '>': OPCODES.GT,
      '<=': OPCODES.LTE,
      '>=': OPCODES.GTE,
      'in': OPCODES.IN,
      'instanceof': OPCODES.INSTANCEOF,
    };

    const opcode = opMap[op];
    if (opcode !== undefined) {
      this.emit(opcode);
    }
  }

  private compileUnaryExpression(node: ASTNode): void {
    const op = node.operator as string;
    const argument = node.argument as ASTNode;
    const prefix = node.prefix as boolean ?? true;

    this.compileNode(argument);

    switch (op) {
      case '-': this.emit(OPCODES.NEG); break;
      case '!': this.emit(OPCODES.NOT); break;
      case '~': this.emit(OPCODES.NOT); break;
      case 'typeof': this.emit(OPCODES.TYPEOF); break;
      case '++':
        this.emit(OPCODES.PUSH_I, [1]);
        this.emit(OPCODES.ADD);
        break;
      case '--':
        this.emit(OPCODES.PUSH_I, [1]);
        this.emit(OPCODES.SUB);
        break;
    }
  }

  private compileLiteral(node: ASTNode): void {
    const value = node.value;
    const raw = node.raw as string;

    if (value === null) {
      this.emit(OPCODES.PUSH_NULL);
    } else if (value === undefined) {
      this.emit(OPCODES.PUSH_UNDEF);
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        this.emit(OPCODES.PUSH_I, [value]);
      } else {
        this.emit(OPCODES.PUSH_F, [value]);
      }
    } else if (typeof value === 'string') {
      const idx = this.addString(value);
      this.emit(OPCODES.PUSH, [idx]);
    } else if (typeof value === 'boolean') {
      this.emit(OPCODES.PUSH_B, [value]);
    }
  }

  private compileIdentifier(node: ASTNode): void {
    const name = node.name as string;
    this.emit(OPCODES.LOAD, [name]);
  }

  private compileCallExpression(node: ASTNode): void {
    const callee = node.callee as ASTNode;
    const args = node.arguments as ASTNode[] || [];

    for (const arg of args) {
      this.compileNode(arg);
    }

    if (callee.type === 'MemberExpression') {
      this.compileNode(callee.object as ASTNode);
      this.emit(OPCODES.PUSH_S, [callee.property as string]);
      this.emit(OPCODES.PROP_GET);
      this.emit(OPCODES.SWAP);
      this.emit(OPCODES.APPLY, [args.length]);
    } else {
      this.compileNode(callee);
      this.emit(OPCODES.PUSH_UNDEF);
      this.emit(OPCODES.APPLY, [args.length]);
    }
  }

  private compileMemberExpression(node: ASTNode): void {
    const object = node.object as ASTNode;
    const property = node.property as ASTNode;
    const computed = node.computed as boolean ?? false;

    this.compileNode(object);

    if (computed) {
      this.compileNode(property);
      this.emit(OPCODES.IDX_GET);
    } else {
      this.emit(OPCODES.PROP_GET, [property.name as string]);
    }
  }

  private compileArrayExpression(node: ASTNode): void {
    const elements = node.elements as ASTNode[] || [];
    for (const el of elements) {
      this.compileNode(el);
    }
    this.emit(OPCODES.CREATE_ARR, [elements.length]);
  }

  private compileObjectExpression(node: ASTNode): void {
    const properties = node.properties as ASTNode[] || [];
    for (const prop of properties) {
      if (prop.type === 'Property') {
        this.compileNode(prop.value as ASTNode);
      }
    }
    for (let i = properties.length - 1; i >= 0; i--) {
      const prop = properties[i];
      if (prop.type === 'Property') {
        const key = prop.key as ASTNode;
        const keyName = key.type === 'Identifier' ? key.name as string : String(prop.key);
        this.emit(OPCODES.PUSH_S, [keyName as string]);
      }
    }
    this.emit(OPCODES.CREATE_OBJ, [properties.length]);
  }

  private compileConditional(node: ASTNode): void {
    const test = node.test as ASTNode;
    const consequent = node.consequent as ASTNode;
    const alternate = node.alternate as ASTNode | null;

    this.compileNode(test);
    const elseLabel = this.createLabel();
    const endLabel = this.createLabel();

    this.emit(OPCODES.JZ, [0]);
    this.patchLabel(elseLabel, this.instructions.length - 1);

    this.compileNode(consequent);
    this.emit(OPCODES.JMP, [0]);
    const jmpToEnd = this.instructions.length - 1;

    this.patchLabel(elseLabel);
    if (alternate) {
      this.compileNode(alternate);
    }

    this.patchLabel(endLabel, jmpToEnd);
  }

  private compileBlock(node: ASTNode): void {
    const body = node.body as ASTNode[] || [];
    this.emit(OPCODES.NEW_SCOPE);
    for (const stmt of body) {
      this.compileNode(stmt);
    }
    this.emit(OPCODES.POP_SCOPE);
  }

  private compileIfStatement(node: ASTNode): void {
    const test = node.test as ASTNode;
    const consequent = node.consequent as ASTNode;
    const alternate = node.alternate as ASTNode | null;

    this.compileNode(test);
    const elseLabel = this.createLabel();

    this.emit(OPCODES.JZ, [0]);
    this.patchLabel(elseLabel, this.instructions.length - 1);

    this.compileNode(consequent);

    if (alternate) {
      const endLabel = this.createLabel();
      this.emit(OPCODES.JMP, [0]);
      const jmpToEnd = this.instructions.length - 1;
      this.patchLabel(elseLabel);
      this.compileNode(alternate);
      this.patchLabel(endLabel, jmpToEnd);
    } else {
      this.patchLabel(elseLabel);
    }
  }

  private compileWhileStatement(node: ASTNode): void {
    const test = node.test as ASTNode;
    const body = node.body as ASTNode;

    const startLabel = this.createLabel();
    const endLabel = this.createLabel();

    this.labelMap.set('_break_target', this.instructions.length);
    this.patchLabel(startLabel);

    this.compileNode(test);
    this.emit(OPCODES.JZ, [0]);
    this.patchLabel(endLabel, this.instructions.length - 1);

    this.compileNode(body);
    this.emit(OPCODES.JMP, [0]);
    this.patchLabel(startLabel, this.instructions.length - 1);

    this.patchLabel(endLabel);
  }

  private compileForStatement(node: ASTNode): void {
    const init = node.init as ASTNode | null;
    const test = node.test as ASTNode | null;
    const update = node.update as ASTNode | null;
    const body = node.body as ASTNode;

    if (init) this.compileNode(init);

    const startLabel = this.createLabel();
    const endLabel = this.createLabel();

    this.labelMap.set('_break_target', this.instructions.length);
    this.labelMap.set('_continue_target', this.instructions.length);
    this.patchLabel(startLabel);

    if (test) {
      this.compileNode(test);
      this.emit(OPCODES.JZ, [0]);
      this.patchLabel(endLabel, this.instructions.length - 1);
    }

    this.compileNode(body);

    this.labelMap.set('_continue_target', this.instructions.length);
    if (update) this.compileNode(update);

    this.emit(OPCODES.JMP, [0]);
    this.patchLabel(startLabel, this.instructions.length - 1);

    this.patchLabel(endLabel);
  }

  private compileReturnStatement(node: ASTNode): void {
    const argument = node.argument as ASTNode | null;
    if (argument) {
      this.compileNode(argument);
    } else {
      this.emit(OPCODES.PUSH_UNDEF);
    }
    this.emit(OPCODES.RET);
  }

  private compileTryStatement(node: ASTNode): void {
    const block = node.block as ASTNode;
    const handler = node.handler as ASTNode | null;
    const finalizer = node.finalizer as ASTNode | null;

    const catchLabel = this.createLabel();
    const finallyLabel = this.createLabel();

    this.emit(OPCODES.TRY, [0, 0]);
    const tryInstr = this.instructions.length - 1;

    this.compileNode(block);
    this.emit(OPCODES.END_TRY);

    if (handler || finalizer) {
      const endLabel = this.createLabel();
      this.emit(OPCODES.JMP, [0]);
      const jmpToEnd = this.instructions.length - 1;

      if (handler) {
        this.patchLabel(catchLabel);
        const param = handler.param as ASTNode;
        if (param.type === 'Identifier') {
          this.emit(OPCODES.CATCH, [param.name as string]);
        }
        this.compileNode(handler.body as ASTNode);
      }

      if (finalizer) {
        this.patchLabel(finallyLabel);
        this.compileNode(finalizer);
      }

      this.patchLabel(endLabel, jmpToEnd);
    }

    this.instructions[tryInstr].operands = [this.instructions.length, this.instructions.length];
  }

  private compileThrowStatement(node: ASTNode): void {
    const argument = node.argument as ASTNode;
    this.compileNode(argument);
    this.emit(OPCODES.THROW);
  }

  private compileExpressionNode(node: ASTNode): void {
    if (node.type === 'SequenceExpression') {
      const expressions = node.expressions as ASTNode[] || [];
      for (const expr of expressions) {
        this.compileNode(expr);
      }
    }
  }

  private emit(opcode: number, operands: (number | string | boolean | object)[] = []): void {
    this.instructions.push({
      opcode,
      operands,
      line: this.options.sourceMap ? this.instructions.length : undefined
    });
  }

  private addString(value: string): number {
    const existing = this.stringIndex.get(value);
    if (existing !== undefined) return existing;

    const idx = this.constants.length;
    this.stringPool.push(value);
    this.constants.push({ type: 'string', value });
    this.stringIndex.set(value, idx);
    return idx;
  }

  private addConstant(value: Value): number {
    const valStr = 'value' in value ? JSON.stringify((value as any).value) : '';
    const key = `${value.type}:${valStr}`;
    const existing = this.constantIndex.get(key);
    if (existing !== undefined) return existing;

    const idx = this.constants.length;
    this.constants.push(value);
    this.constantIndex.set(key, idx);
    return idx;
  }

  private labelCounter = 0;
  private createLabel(): string {
    return `_label_${this.labelCounter++}`;
  }

  private patchLabel(label: string, instructionIndex?: number): void {
    if (instructionIndex !== undefined) {
      this.labelMap.set(label, this.instructions.length);
      this.instructions[instructionIndex].operands[0] = this.instructions.length;
    } else {
      this.labelMap.set(label, this.instructions.length);
    }
  }

  private tokenize(code: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    while (i < code.length) {
      if (/\s/.test(code[i])) { i++; continue; }
      if (/[0-9]/.test(code[i])) {
        let num = '';
        while (i < code.length && /[0-9.]/.test(code[i])) {
          num += code[i++];
        }
        tokens.push(num);
        continue;
      }
      if (/[a-zA-Z_$]/.test(code[i])) {
        let id = '';
        while (i < code.length && /[a-zA-Z0-9_$]/.test(code[i])) {
          id += code[i++];
        }
        tokens.push(id);
        continue;
      }
      if (code[i] === '"' || code[i] === "'") {
        const quote = code[i++];
        let str = '';
        while (i < code.length && code[i] !== quote) {
          if (code[i] === '\\') { str += code[i++] + code[i++]; }
          else { str += code[i++]; }
        }
        i++;
        tokens.push(`"${str}"`);
        continue;
      }
      if ('+-*/%=!<>&|^~(){}[];,.:?'.includes(code[i])) {
        const twoChars = i + 1 < code.length ? code[i] + code[i + 1] : '';
        const threeChars = i + 2 < code.length ? code[i] + code[i + 1] + code[i + 2] : '';
        if (['===', '!==', '<<=', '>>='].includes(threeChars)) {
          tokens.push(threeChars);
          i += 3;
        } else if (['==', '!=', '<=', '>=', '<<', '>>', '**', '&&', '||', '->'].includes(twoChars)) {
          tokens.push(twoChars);
          i += 2;
        } else {
          tokens.push(code[i++]);
        }
        continue;
      }
      i++;
    }
    return tokens;
  }

  private parse(tokens: string[]): ASTNode[] {
    const ast: ASTNode[] = [];
    let pos = 0;

    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];
    const expect = (expected: string) => {
      const t = consume();
      if (t !== expected) throw new Error(`Expected ${expected}, got ${t}`);
      return t;
    };

    const parsePrimary = (): ASTNode => {
      const t = peek();
      if (t === '(') {
        consume();
        const expr = parseExpression();
        expect(')');
        return expr;
      }
      if (t === '[') {
        consume();
        const elements: ASTNode[] = [];
        while (peek() !== ']') {
          elements.push(parseExpression());
          if (peek() === ',') consume();
        }
        expect(']');
        return { type: 'ArrayExpression', elements };
      }
      if (t === '{') {
        consume();
        const properties: ASTNode[] = [];
        while (peek() !== '}') {
          const key = parsePrimary();
          expect(':');
          const value = parseExpression();
          properties.push({ type: 'Property', key, value });
          if (peek() === ',') consume();
        }
        expect('}');
        return { type: 'ObjectExpression', properties };
      }
      if (t && /[0-9]/.test(t[0])) {
        consume();
        const num = parseFloat(t);
        return { type: 'Literal', value: num, raw: t };
      }
      if (t && t.startsWith('"')) {
        consume();
        return { type: 'Literal', value: t.slice(1, -1), raw: t };
      }
      if (t === 'true' || t === 'false') {
        consume();
        return { type: 'Literal', value: t === 'true', raw: t };
      }
      if (t === 'null') { consume(); return { type: 'Literal', value: null, raw: t }; }
      if (t === 'undefined') { consume(); return { type: 'Literal', value: undefined, raw: t }; }

      if (t && /[a-zA-Z_$]/.test(t[0])) {
        consume();
        const node: ASTNode = { type: 'Identifier', name: t };
        return node;
      }
      consume();
      return { type: 'Literal', value: undefined, raw: '' };
    };

    const parseCallOrMember = (node: ASTNode): ASTNode => {
      while (peek() === '(' || peek() === '[' || peek() === '.') {
        if (peek() === '(') {
          consume();
          const args: ASTNode[] = [];
          while (peek() !== ')') {
            args.push(parseExpression());
            if (peek() === ',') consume();
          }
          expect(')');
          node = { type: 'CallExpression', callee: node, arguments: args };
        } else if (peek() === '[') {
          consume();
          const prop = parseExpression();
          expect(']');
          node = { type: 'MemberExpression', object: node, property: prop, computed: true };
        } else if (peek() === '.') {
          consume();
          const prop = parsePrimary();
          node = { type: 'MemberExpression', object: node, property: prop, computed: false };
        }
      }
      return node;
    };

    const parseUnary = (): ASTNode => {
      if (peek() === '-' || peek() === '!' || peek() === '~' || peek() === 'typeof') {
        const op = consume();
        const arg = parseUnary();
        return { type: 'UnaryExpression', operator: op, argument: arg, prefix: true };
      }
      return parseCallOrMember(parsePrimary());
    };

    const parseMultiplicative = (): ASTNode => {
      let left = parseUnary();
      while (peek() === '*' || peek() === '/' || peek() === '%') {
        const op = consume();
        const right = parseUnary();
        left = { type: 'BinaryExpression', operator: op, left, right };
      }
      return left;
    };

    const parseAdditive = (): ASTNode => {
      let left = parseMultiplicative();
      while (peek() === '+' || peek() === '-') {
        const op = consume();
        const right = parseMultiplicative();
        left = { type: 'BinaryExpression', operator: op, left, right };
      }
      return left;
    };

    const parseComparison = (): ASTNode => {
      let left = parseAdditive();
      const comparisonOps = ['==', '===', '!=', '!==', '<', '>', '<=', '>=', 'in', 'instanceof'];
      while (comparisonOps.includes(peek())) {
        const op = consume();
        const right = parseAdditive();
        left = { type: 'BinaryExpression', operator: op, left, right };
      }
      return left;
    };

    const parseBitwise = (): ASTNode => {
      let left = parseComparison();
      const bitOps = ['&', '|', '^', '<<', '>>'];
      while (bitOps.includes(peek())) {
        const op = consume();
        const right = parseComparison();
        left = { type: 'BinaryExpression', operator: op, left, right };
      }
      return left;
    };

    const parseLogicalAnd = (): ASTNode => {
      let left = parseBitwise();
      while (peek() === '&&') {
        const op = consume();
        const right = parseBitwise();
        left = { type: 'BinaryExpression', operator: op, left, right };
      }
      return left;
    };

    const parseLogicalOr = (): ASTNode => {
      let left = parseLogicalAnd();
      while (peek() === '||') {
        const op = consume();
        const right = parseLogicalAnd();
        left = { type: 'BinaryExpression', operator: op, left, right };
      }
      return left;
    };

    const parseExpression = (): ASTNode => {
      return parseLogicalOr();
    };

    const parseStatement = (): ASTNode => {
      if (peek() === 'var' || peek() === 'let' || peek() === 'const') {
        consume();
        const name = consume();
        let init: ASTNode | null = null;
        if (peek() === '=') {
          consume();
          init = parseExpression();
        }
        expect(';');
        return {
          type: 'VariableDeclaration',
          declarations: [{ type: 'VariableDeclarator', name, init }]
        };
      }
      if (peek() === 'function') {
        consume();
        const name = consume();
        expect('(');
        const params: ASTNode[] = [];
        while (peek() !== ')') {
          params.push(parsePrimary());
          if (peek() === ',') consume();
        }
        expect(')');
        expect('{');
        const body: ASTNode[] = [];
        while (peek() !== '}') {
          body.push(parseStatement());
        }
        expect('}');
        return { type: 'FunctionDeclaration', name, params, body };
      }
      if (peek() === 'if') {
        consume();
        expect('(');
        const test = parseExpression();
        expect(')');
        const consequent = parseStatement();
        let alternate: ASTNode | null = null;
        if (peek() === 'else') {
          consume();
          alternate = parseStatement();
        }
        return { type: 'IfStatement', test, consequent, alternate };
      }
      if (peek() === 'while') {
        consume();
        expect('(');
        const test = parseExpression();
        expect(')');
        const body = parseStatement();
        return { type: 'WhileStatement', test, body };
      }
      if (peek() === 'for') {
        consume();
        expect('(');
        let init: ASTNode | null = null;
        if (peek() !== ';') {
          if (peek() === 'var' || peek() === 'let' || peek() === 'const') {
            consume();
            const name = consume();
            let initExpr: ASTNode | null = null;
            if (peek() === '=') { consume(); initExpr = parseExpression(); }
            init = { type: 'VariableDeclaration', declarations: [{ type: 'VariableDeclarator', name, init: initExpr }] };
          } else {
            init = parseExpression();
          }
        }
        expect(';');
        let test: ASTNode | null = null;
        if (peek() !== ';') test = parseExpression();
        expect(';');
        let update: ASTNode | null = null;
        if (peek() !== ')') update = parseExpression();
        expect(')');
        const body = parseStatement();
        return { type: 'ForStatement', init, test, update, body };
      }
      if (peek() === 'return') {
        consume();
        let argument: ASTNode | null = null;
        if (peek() !== ';') argument = parseExpression();
        expect(';');
        return { type: 'ReturnStatement', argument };
      }
      if (peek() === 'try') {
        consume();
        expect('{');
        const block: ASTNode[] = [];
        while (peek() !== '}') block.push(parseStatement());
        expect('}');
        let handler: ASTNode | null = null;
        if (peek() === 'catch') {
          consume();
          expect('(');
          const param = parsePrimary();
          expect(')');
          expect('{');
          const body: ASTNode[] = [];
          while (peek() !== '}') body.push(parseStatement());
          expect('}');
          handler = { type: 'CatchClause', param, body };
        }
        let finalizer: ASTNode | null = null;
        if (peek() === 'finally') {
          consume();
          expect('{');
          const fbody: ASTNode[] = [];
          while (peek() !== '}') fbody.push(parseStatement());
          expect('}');
          finalizer = { type: 'BlockStatement', body: fbody };
        }
        return { type: 'TryStatement', block: { type: 'BlockStatement', body: block }, handler, finalizer };
      }
      if (peek() === 'throw') {
        consume();
        const argument = parseExpression();
        expect(';');
        return { type: 'ThrowStatement', argument };
      }
      if (peek() === 'break') {
        consume();
        expect(';');
        return { type: 'BreakStatement' };
      }
      if (peek() === 'continue') {
        consume();
        expect(';');
        return { type: 'ContinueStatement' };
      }
      if (peek() === '{') {
        consume();
        const body: ASTNode[] = [];
        while (peek() !== '}') body.push(parseStatement());
        expect('}');
        return { type: 'BlockStatement', body };
      }
      const expr = parseExpression();
      expect(';');
      return expr;
    };

    while (pos < tokens.length) {
      ast.push(parseStatement());
    }

    return [{ type: 'Program', body: ast }];
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

  reset(): void {
    this.instructions = [];
    this.constants = [];
    this.stringPool = [];
    this.stringIndex.clear();
    this.constantIndex.clear();
    this.labelMap.clear();
  }
}
