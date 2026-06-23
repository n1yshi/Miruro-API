import { VirtualMachine } from './runtime';
import { BytecodeInstruction, Value, Scope, Frame } from '../utils/types';
import { OPCODES } from './opcodes';

type OpcodeHandler = (instr: BytecodeInstruction, vm: VirtualMachine) => Promise<void> | void;

export class Dispatcher {
  private vm: VirtualMachine;
  private handlers: Map<number, OpcodeHandler>;
  private generatedHandlers: boolean = false;

  constructor(vm: VirtualMachine) {
    this.vm = vm;
    this.handlers = new Map();
    this.registerCoreHandlers();
  }

  private registerCoreHandlers(): void {
    const h = this.buildHandlerMap();
    for (const [opcode, handler] of h) {
      this.handlers.set(opcode, handler);
    }
  }

  private binaryOp(
    op: (a: number, b: number) => number,
    isFloat: boolean = false
  ): OpcodeHandler {
    return (instr, vm) => {
      const b = vm.pop();
      const a = vm.pop();
      const aVal = a.type === 'integer' || a.type === 'float' ? a.value : 0;
      const bVal = b.type === 'integer' || b.type === 'float' ? b.value : 0;
      const result = op(aVal, bVal);
      vm.push(isFloat ? { type: 'float', value: result } : { type: 'integer', value: result });
    };
  }

  private comparisonOp(predicate: (a: number, b: number) => boolean): OpcodeHandler {
    return (instr, vm) => {
      const b = vm.pop();
      const a = vm.pop();
      const aVal = a.type === 'integer' || a.type === 'float' ? a.value : 0;
      const bVal = b.type === 'integer' || b.type === 'float' ? b.value : 0;
      vm.push({ type: 'boolean', value: predicate(aVal, bVal) });
    };
  }

  private buildHandlerMap(): Map<number, OpcodeHandler> {
    const m = new Map<number, OpcodeHandler>();

    m.set(OPCODES.NOP, () => {});

    m.set(OPCODES.HALT, (_, vm) => { vm.halt(); });

    m.set(OPCODES.JMP, (instr, vm) => {
      vm.setIP((instr.operands[0] as number) - 1);
    });

    m.set(OPCODES.JZ, (instr, vm) => {
      const val = vm.pop();
      if ((val.type === 'integer' && val.value === 0) ||
          (val.type === 'boolean' && !val.value) ||
          val.type === 'null' || val.type === 'undefined') {
        vm.setIP((instr.operands[0] as number) - 1);
      }
    });

    m.set(OPCODES.JNZ, (instr, vm) => {
      const val = vm.pop();
      if ((val.type === 'integer' && val.value !== 0) ||
          (val.type === 'boolean' && val.value) ||
          val.type === 'object') {
        vm.setIP((instr.operands[0] as number) - 1);
      }
    });

    m.set(OPCODES.JE, (instr, vm) => {
      const b = vm.pop();
      const a = vm.pop();
      if (this.abstractEquals(a, b)) {
        vm.setIP((instr.operands[0] as number) - 1);
      }
    });

    m.set(OPCODES.JNE, (instr, vm) => {
      const b = vm.pop();
      const a = vm.pop();
      if (!this.abstractEquals(a, b)) {
        vm.setIP((instr.operands[0] as number) - 1);
      }
    });

    m.set(OPCODES.JG, (instr, vm) => {
      const b = vm.pop();
      const a = vm.pop();
      const aVal = a.type === 'integer' || a.type === 'float' ? a.value : 0;
      const bVal = b.type === 'integer' || b.type === 'float' ? b.value : 0;
      if (aVal > bVal) vm.setIP((instr.operands[0] as number) - 1);
    });

    m.set(OPCODES.JL, (instr, vm) => {
      const b = vm.pop();
      const a = vm.pop();
      const aVal = a.type === 'integer' || a.type === 'float' ? a.value : 0;
      const bVal = b.type === 'integer' || b.type === 'float' ? b.value : 0;
      if (aVal < bVal) vm.setIP((instr.operands[0] as number) - 1);
    });

    m.set(OPCODES.JGE, (instr, vm) => {
      const b = vm.pop();
      const a = vm.pop();
      const aVal = a.type === 'integer' || a.type === 'float' ? a.value : 0;
      const bVal = b.type === 'integer' || b.type === 'float' ? b.value : 0;
      if (aVal >= bVal) vm.setIP((instr.operands[0] as number) - 1);
    });

    m.set(OPCODES.JLE, (instr, vm) => {
      const b = vm.pop();
      const a = vm.pop();
      const aVal = a.type === 'integer' || a.type === 'float' ? a.value : 0;
      const bVal = b.type === 'integer' || b.type === 'float' ? b.value : 0;
      if (aVal <= bVal) vm.setIP((instr.operands[0] as number) - 1);
    });

    m.set(OPCODES.ADD, this.binaryOp((a, b) => a + b));
    m.set(OPCODES.SUB, this.binaryOp((a, b) => a - b));
    m.set(OPCODES.MUL, this.binaryOp((a, b) => a * b));
    m.set(OPCODES.DIV, this.binaryOp((a, b) => a / b, true));
    m.set(OPCODES.MOD, this.binaryOp((a, b) => a % b));
    m.set(OPCODES.POW, this.binaryOp((a, b) => Math.pow(a, b), true));

    m.set(OPCODES.NEG, (_, vm) => {
      const val = vm.pop();
      if (val.type === 'integer' || val.type === 'float') {
        vm.push({ type: val.type, value: -val.value });
      }
    });

    m.set(OPCODES.INC, (_, vm) => {
      const val = vm.pop();
      if (val.type === 'integer') {
        vm.push({ type: 'integer', value: val.value + 1 });
      } else if (val.type === 'float') {
        vm.push({ type: 'float', value: val.value + 1 });
      }
    });

    m.set(OPCODES.DEC, (_, vm) => {
      const val = vm.pop();
      if (val.type === 'integer') {
        vm.push({ type: 'integer', value: val.value - 1 });
      } else if (val.type === 'float') {
        vm.push({ type: 'float', value: val.value - 1 });
      }
    });

    m.set(OPCODES.AND, this.binaryOp((a, b) => a & b));
    m.set(OPCODES.OR, this.binaryOp((a, b) => a | b));
    m.set(OPCODES.XOR, this.binaryOp((a, b) => a ^ b));
    m.set(OPCODES.SHL, this.binaryOp((a, b) => a << b));
    m.set(OPCODES.SHR, this.binaryOp((a, b) => a >> b));
    m.set(OPCODES.NOT, (_, vm) => {
      const val = vm.pop();
      if (val.type === 'integer') {
        vm.push({ type: 'integer', value: ~val.value });
      }
    });

    m.set(OPCODES.EQ, (_, vm) => {
      const b = vm.pop();
      const a = vm.pop();
      vm.push({ type: 'boolean', value: this.abstractEquals(a, b) });
    });

    m.set(OPCODES.SEQ, (_, vm) => {
      const b = vm.pop();
      const a = vm.pop();
      vm.push({ type: 'boolean', value: this.strictEquals(a, b) });
    });

    m.set(OPCODES.NEQ, (_, vm) => {
      const b = vm.pop();
      const a = vm.pop();
      vm.push({ type: 'boolean', value: !this.abstractEquals(a, b) });
    });

    m.set(OPCODES.SNEQ, (_, vm) => {
      const b = vm.pop();
      const a = vm.pop();
      vm.push({ type: 'boolean', value: !this.strictEquals(a, b) });
    });

    m.set(OPCODES.LT, (_, vm) => {
      const b = vm.pop();
      const a = vm.pop();
      vm.push({ type: 'boolean', value: this.compare(a, b) < 0 });
    });

    m.set(OPCODES.GT, (_, vm) => {
      const b = vm.pop();
      const a = vm.pop();
      vm.push({ type: 'boolean', value: this.compare(a, b) > 0 });
    });

    m.set(OPCODES.LTE, (_, vm) => {
      const b = vm.pop();
      const a = vm.pop();
      vm.push({ type: 'boolean', value: this.compare(a, b) <= 0 });
    });

    m.set(OPCODES.GTE, (_, vm) => {
      const b = vm.pop();
      const a = vm.pop();
      vm.push({ type: 'boolean', value: this.compare(a, b) >= 0 });
    });

    m.set(OPCODES.IN, (_, vm) => {
      const prop = vm.pop();
      const obj = vm.pop();
      const propName = prop.type === 'string' ? prop.value : String(vm.resolveValue(prop));
      const objValue = vm.resolveValue(obj);
      vm.push({ type: 'boolean', value: typeof objValue === 'object' && objValue !== null && propName in objValue });
    });

    m.set(OPCODES.INSTANCEOF, (_, vm) => {
      const constructor = vm.pop();
      const obj = vm.pop();
      const objValue = vm.resolveValue(obj);
      const ctorValue = vm.resolveValue(constructor);
      vm.push({
        type: 'boolean',
        value: typeof ctorValue === 'function' && objValue instanceof (ctorValue as Function)
      });
    });

    m.set(OPCODES.DECLARE, (instr, vm) => {
      const name = instr.operands[0] as string;
      const scope = vm.getCurrentScope();
      if (!scope.variables.has(name)) {
        scope.variables.set(name, { type: 'undefined' });
      }
    });

    m.set(OPCODES.LOAD, (instr, vm) => {
      const name = instr.operands[0] as string;
      const value = this.resolveVariable(vm, name);
      vm.push(value);
    });

    m.set(OPCODES.STORE, (instr, vm) => {
      const name = instr.operands[0] as string;
      const value = vm.pop();
      this.assignVariable(vm, name, value);
    });

    m.set(OPCODES.LD_GLOBAL, (instr, vm) => {
      const name = instr.operands[0] as string;
      const globalScope = vm.getState().scopes[0];
      const value = globalScope.variables.get(name) ?? { type: 'undefined' };
      vm.push(value);
    });

    m.set(OPCODES.ST_GLOBAL, (instr, vm) => {
      const name = instr.operands[0] as string;
      const value = vm.pop();
      const globalScope = vm.getState().scopes[0];
      globalScope.variables.set(name, value);
    });

    m.set(OPCODES.LD_SCOPE, (instr, vm) => {
      const depth = instr.operands[0] as number;
      const name = instr.operands[1] as string;
      const scopes = vm.getState().scopes;
      const idx = scopes.length - 1 - depth;
      const variableValue = idx >= 0 ? scopes[idx].variables.get(name) : undefined;
      const value: Value = variableValue ?? { type: 'undefined' };
      vm.push(value);
    });

    m.set(OPCODES.ST_SCOPE, (instr, vm) => {
      const depth = instr.operands[0] as number;
      const name = instr.operands[1] as string;
      const value = vm.pop();
      const scopes = vm.getState().scopes;
      const idx = scopes.length - 1 - depth;
      if (idx >= 0) {
        scopes[idx].variables.set(name, value);
      }
    });

    m.set(OPCODES.PUSH, (instr, vm) => {
      const idx = instr.operands[0] as number;
      vm.push(vm.getConstant(idx));
    });

    m.set(OPCODES.PUSH_I, (instr, vm) => {
      vm.push({ type: 'integer', value: instr.operands[0] as number });
    });

    m.set(OPCODES.PUSH_F, (instr, vm) => {
      vm.push({ type: 'float', value: instr.operands[0] as number });
    });

    m.set(OPCODES.PUSH_S, (instr, vm) => {
      vm.push({ type: 'string', value: instr.operands[0] as string });
    });

    m.set(OPCODES.PUSH_B, (instr, vm) => {
      vm.push({ type: 'boolean', value: instr.operands[0] as boolean });
    });

    m.set(OPCODES.PUSH_NULL, (_, vm) => { vm.push({ type: 'null' }); });
    m.set(OPCODES.PUSH_UNDEF, (_, vm) => { vm.push({ type: 'undefined' }); });

    m.set(OPCODES.POP, (_, vm) => { vm.pop(); });

    m.set(OPCODES.DUP, (_, vm) => {
      const val = vm.peek();
      vm.push({ ...val });
    });

    m.set(OPCODES.SWAP, (_, vm) => {
      const a = vm.pop();
      const b = vm.pop();
      vm.push(a);
      vm.push(b);
    });

    m.set(OPCODES.CREATE_OBJ, (instr, vm) => {
      const propCount = instr.operands[0] as number;
      const obj: Record<string, unknown> = {};
      const keys: string[] = [];
      for (let i = 0; i < propCount; i++) {
        keys.unshift(vm.pop() as unknown as string);
      }
      for (let i = 0; i < propCount; i++) {
        const val = vm.resolveValue(vm.pop());
        obj[keys[i]] = val;
      }
      vm.push({ type: 'object', value: obj });
    });

    m.set(OPCODES.CREATE_ARR, (instr, vm) => {
      const count = instr.operands[0] as number;
      const arr: Value[] = [];
      for (let i = 0; i < count; i++) {
        arr.unshift(vm.pop());
      }
      vm.push({ type: 'array', value: arr });
    });

    m.set(OPCODES.PROP_GET, (instr, vm) => {
      const name = instr.operands[0] as string;
      const obj = vm.pop();
      const resolved = vm.resolveValue(obj);
      if (typeof resolved === 'object' && resolved !== null) {
        const val = (resolved as Record<string, unknown>)[name];
        vm.push(vm.wrapValue(val));
      } else {
        vm.push({ type: 'undefined' });
      }
    });

    m.set(OPCODES.PROP_SET, (instr, vm) => {
      const name = instr.operands[0] as string;
      const value = vm.pop();
      const obj = vm.pop();
      const resolved = vm.resolveValue(obj);
      if (typeof resolved === 'object' && resolved !== null) {
        (resolved as Record<string, unknown>)[name] = vm.resolveValue(value);
      }
    });

    m.set(OPCODES.PROP_DEL, (instr, vm) => {
      const name = instr.operands[0] as string;
      const obj = vm.pop();
      const resolved = vm.resolveValue(obj);
      if (typeof resolved === 'object' && resolved !== null) {
        delete (resolved as Record<string, unknown>)[name];
      }
    });

    m.set(OPCODES.PROP_GET_DYN, (_, vm) => {
      const prop = vm.pop();
      const obj = vm.pop();
      const propName = vm.resolveValue(prop);
      const resolved = vm.resolveValue(obj);
      if (typeof resolved === 'object' && resolved !== null) {
        const val = (resolved as Record<string, unknown>)[String(propName)];
        vm.push(vm.wrapValue(val));
      } else {
        vm.push({ type: 'undefined' });
      }
    });

    m.set(OPCODES.PROP_SET_DYN, (_, vm) => {
      const value = vm.pop();
      const prop = vm.pop();
      const obj = vm.pop();
      const propName = vm.resolveValue(prop);
      const resolved = vm.resolveValue(obj);
      if (typeof resolved === 'object' && resolved !== null) {
        (resolved as Record<string, unknown>)[String(propName)] = vm.resolveValue(value);
      }
    });

    m.set(OPCODES.IDX_GET, (_, vm) => {
      const idx = vm.pop();
      const arr = vm.pop();
      if (arr.type === 'array') {
        const i = idx.type === 'integer' ? idx.value : 0;
        vm.push(i >= 0 && i < arr.value.length ? arr.value[i] : { type: 'undefined' });
      } else if (arr.type === 'string') {
        const i = idx.type === 'integer' ? idx.value : 0;
        const char = arr.value[i] ?? '';
        vm.push({ type: 'string', value: char });
      } else {
        vm.push({ type: 'undefined' });
      }
    });

    m.set(OPCODES.IDX_SET, (_, vm) => {
      const idx = vm.pop();
      const value = vm.pop();
      const arr = vm.pop();
      const resolved = vm.resolveValue(arr);
      if (Array.isArray(resolved)) {
        const i = idx.type === 'integer' ? idx.value : 0;
        resolved[i] = vm.resolveValue(value);
      }
    });

    m.set(OPCODES.TYPEOF, (_, vm) => {
      const val = vm.pop();
      const typeName = val.type === 'undefined' ? 'undefined'
        : val.type === 'null' ? 'object'
        : val.type === 'integer' || val.type === 'float' ? 'number'
        : val.type;
      vm.push({ type: 'string', value: typeName });
    });

    m.set(OPCODES.DELETE, (_, vm) => {
      vm.push({ type: 'boolean', value: true });
    });

    m.set(OPCODES.TRY, (instr, vm) => {
      vm.getState().metadata.set('try_catch_ip', instr.operands[0] as number);
      vm.getState().metadata.set('try_finally_ip', instr.operands[1] as number);
    });

    m.set(OPCODES.CATCH, (instr, vm) => {
      const name = instr.operands[0] as string;
      const exception = vm.getException();
      if (exception) {
        const scope = vm.getCurrentScope();
        scope.variables.set(name, exception);
        vm.setException(null);
      }
    });

    m.set(OPCODES.FINALLY, (instr, vm) => {
      const target = instr.operands[0] as number;
      if (!vm.getException()) {
        vm.setIP(target);
      }
    });

    m.set(OPCODES.THROW, (_, vm) => {
      const val = vm.pop();
      vm.setException(val);
      const tryCatchIp = vm.getState().metadata.get('try_catch_ip');
      if (typeof tryCatchIp === 'number') {
        vm.setIP(tryCatchIp);
      } else {
        throw new Error(`Uncaught exception: ${JSON.stringify(vm.resolveValue(val))}`);
      }
    });

    m.set(OPCODES.END_TRY, (_, vm) => {
      vm.getState().metadata.delete('try_catch_ip');
      vm.getState().metadata.delete('try_finally_ip');
    });

    m.set(OPCODES.NEW_SCOPE, (_, vm) => {
      const newScope: Scope = {
        variables: new Map(),
        parent: vm.getCurrentScope()
      };
      vm.pushScope(newScope);
    });

    m.set(OPCODES.POP_SCOPE, (_, vm) => {
      vm.popScope();
    });

    m.set(OPCODES.CALL, (instr, vm) => {
      const address = instr.operands[0] as number;
      const argCount = instr.operands[1] as number;
      const args: Value[] = [];
      for (let i = 0; i < argCount; i++) {
        args.unshift(vm.pop());
      }
      const frame: Frame = {
        thisValue: vm.getState().currentFrame?.thisValue ?? globalThis,
        locals: new Map(),
        parentScope: vm.getCurrentScope(),
        returnAddress: vm.getIP() + 1,
        closureData: new Map(),
        metadata: new Map()
      };
      vm.getState().metadata.set('return_frame', frame);
      vm.setIP(address);
    });

    m.set(OPCODES.RET, (_, vm) => {
      const hasValue = vm.state.stack.length > 0;
      const returnValue: Value = hasValue ? vm.pop() : { type: 'undefined' };
      const frame = vm.getState().metadata.get('return_frame') as Frame | undefined;
      if (frame) {
        vm.setIP(frame.returnAddress);
        vm.getState().metadata.delete('return_frame');
      } else {
        vm.halt();
      }
      vm.push(returnValue);
    });

    m.set(OPCODES.CALL_NATIVE, (instr, vm) => {
      const fnIndex = instr.operands[0] as number;
      const fn = vm.resolveValue(vm.getConstant(fnIndex));
      if (typeof fn === 'function') {
        const result = fn();
        vm.push(vm.wrapValue(result));
      }
    });

    m.set(OPCODES.APPLY, (instr, vm) => {
      const argCount = instr.operands[0] as number;
      const args: Value[] = [];
      for (let i = 0; i < argCount; i++) {
        args.unshift(vm.pop());
      }
      const fn = vm.pop();
      const thisVal = vm.pop();
      const fnResolved = vm.resolveValue(fn);
      if (typeof fnResolved === 'function') {
        const resolvedArgs = args.map(a => vm.resolveValue(a));
        const result = (fnResolved as Function).apply(vm.resolveValue(thisVal), resolvedArgs);
        vm.push(vm.wrapValue(result));
      }
    });

    m.set(OPCODES.CONSTRUCT, (instr, vm) => {
      const argCount = instr.operands[0] as number;
      const args: Value[] = [];
      for (let i = 0; i < argCount; i++) {
        args.unshift(vm.pop());
      }
      const ctor = vm.pop();
      const ctorResolved = vm.resolveValue(ctor);
      if (typeof ctorResolved === 'function') {
        const resolvedArgs = args.map(a => vm.resolveValue(a));
        const result = new (ctorResolved as any)(...resolvedArgs);
        vm.push(vm.wrapValue(result));
      }
    });

    m.set(OPCODES.CREATE_CLOSURE, (instr, vm) => {
      const address = instr.operands[0] as number;
      const captureCount = instr.operands[1] as number;
      const closureData = new Map<string, Value>();
      for (let i = 0; i < captureCount; i++) {
        const val = vm.pop();
        const name = `_c${i}`;
        closureData.set(name, val);
      }
      const closureFn = () => {
        const closureVM = new VirtualMachine(
          vm.getInstructions(),
          vm.getConstants(),
          vm.getStringPool(),
          { maxInstructions: 1000, timeout: 2000 }
        );
        const scope: Scope = {
          variables: new Map(Array.from(closureData.entries())),
          parent: vm.getCurrentScope()
        };
        closureVM.pushScope(scope);
        closureVM.setIP(address);
        return closureVM.execute();
      };
      vm.push({ type: 'function', value: closureFn });
    });

    m.set(OPCODES.BIND_THIS, (_, vm) => {
      const fn = vm.pop();
      const thisVal = vm.pop();
      if (fn.type === 'function') {
        const bound = fn.value.bind(vm.resolveValue(thisVal));
        vm.push({ type: 'function', value: bound });
      }
    });

    m.set(OPCODES.MAKE_PROMISE, (instr, vm) => {
      const address = instr.operands[0] as number;
      const promise = new Promise<Value>((resolve, reject) => {
        const pvm = new VirtualMachine(
          vm.getInstructions(),
          vm.getConstants(),
          vm.getStringPool(),
          { maxInstructions: 1000, timeout: 2000 }
        );
        pvm.getState().metadata.set('promise_resolve', resolve);
        pvm.getState().metadata.set('promise_reject', reject);
        pvm.setIP(address);
        pvm.execute().then(resolve).catch(reject);
      });
      vm.push({ type: 'promise', value: promise });
    });

    m.set(OPCODES.AWAIT, async (_, vm) => {
      const val = vm.pop();
      if (val.type === 'promise') {
        try {
          const result = await val.value;
          vm.push(result);
        } catch (err) {
          vm.setException(vm.wrapValue(err));
        }
      } else {
        vm.push(val);
      }
    });

    m.set(OPCODES.RESOLVE, (_, vm) => {
      const val = vm.pop();
      const resolve = vm.getState().metadata.get('promise_resolve') as ((v: Value) => void) | undefined;
      if (resolve) resolve(val);
    });

    m.set(OPCODES.REJECT, (_, vm) => {
      const val = vm.pop();
      const reject = vm.getState().metadata.get('promise_reject') as ((v: Value) => void) | undefined;
      if (reject) reject(val);
    });

    m.set(OPCODES.NEW_REGEX, (instr, vm) => {
      const pattern = instr.operands[0] as string;
      const flags = instr.operands[1] as string;
      vm.push({ type: 'object', value: new RegExp(pattern, flags) });
    });

    m.set(OPCODES.CRYPTO_RANDOM, (_, vm) => {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      vm.push({ type: 'object', value: bytes });
    });

    m.set(OPCODES.TYPE_CONVERT, (instr, vm) => {
      const targetType = instr.operands[0] as string;
      const val = vm.pop();
      switch (targetType) {
        case 'number':
          if (val.type === 'string') vm.push({ type: 'integer', value: Number(val.value) });
          else if (val.type === 'boolean') vm.push({ type: 'integer', value: val.value ? 1 : 0 });
          else vm.push(val);
          break;
        case 'string':
          vm.push({ type: 'string', value: String(vm.resolveValue(val)) });
          break;
        case 'boolean':
          vm.push({ type: 'boolean', value: !!vm.resolveValue(val) });
          break;
        default:
          vm.push(val);
      }
    });

    m.set(OPCODES.DEBUGGER, () => {
      debugger;
    });

    m.set(OPCODES.BREAKPOINT, () => {
      const fn = new Function('debugger;');
      fn();
    });

    m.set(OPCODES.EVAL_EXPR, (instr, vm) => {
      const expr = instr.operands[0] as string;
      try {
        const fn = new Function('return ' + expr);
        const result = fn();
        vm.push(vm.wrapValue(result));
      } catch {
        vm.push({ type: 'undefined' });
      }
    });

    m.set(OPCODES.CONCAT, (_, vm) => {
      const b = vm.pop();
      const a = vm.pop();
      const aStr = String(vm.resolveValue(a));
      const bStr = String(vm.resolveValue(b));
      vm.push({ type: 'string', value: aStr + bStr });
    });

    m.set(OPCODES.LENGTH, (_, vm) => {
      const val = vm.pop();
      if (val.type === 'array') {
        vm.push({ type: 'integer', value: val.value.length });
      } else if (val.type === 'string') {
        vm.push({ type: 'integer', value: val.value.length });
      } else {
        vm.push({ type: 'integer', value: 0 });
      }
    });

    m.set(OPCODES.ITERATE, (instr, vm) => {
      const bodyAddr = instr.operands[0] as number;
      const count = instr.operands[1] as number;
      for (let i = 0; i < count; i++) {
        vm.push({ type: 'integer', value: i });
        vm.setIP(bodyAddr);
      }
    });

    m.set(OPCODES.FOR_IN, (instr, vm) => {
      const bodyAddr = instr.operands[0] as number;
      const obj = vm.pop();
      const resolved = vm.resolveValue(obj);
      if (typeof resolved === 'object' && resolved !== null) {
        for (const key in resolved as Record<string, unknown>) {
          vm.push({ type: 'string', value: key });
          vm.setIP(bodyAddr);
        }
      }
    });

    m.set(OPCODES.FOR_OF, (instr, vm) => {
      const bodyAddr = instr.operands[0] as number;
      const iterable = vm.pop();
      const resolved = vm.resolveValue(iterable);
      if (Array.isArray(resolved)) {
        for (const item of resolved) {
          vm.push(vm.wrapValue(item));
          vm.setIP(bodyAddr);
        }
      }
    });

    return m;
  }

  async dispatch(instr: BytecodeInstruction): Promise<void> {
    const handler = this.handlers.get(instr.opcode);
    if (!handler) {
      throw new Error(`VM: Unknown opcode ${instr.opcode} at IP ${this.vm.getIP()}`);
    }
    const result = handler(instr, this.vm);
    if (result instanceof Promise) {
      await result;
    }
  }

  private abstractEquals(a: Value, b: Value): boolean {
    const aVal = this.vm.resolveValue(a);
    const bVal = this.vm.resolveValue(b);
    return aVal == bVal;
  }

  private strictEquals(a: Value, b: Value): boolean {
    if (a.type !== b.type) return false;
    const aVal = this.vm.resolveValue(a);
    const bVal = this.vm.resolveValue(b);
    return aVal === bVal;
  }

  private compare(a: Value, b: Value): number {
    const aVal = this.vm.resolveValue(a);
    const bVal = this.vm.resolveValue(b);
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return aVal - bVal;
    }
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    }
    return String(aVal).localeCompare(String(bVal));
  }

  private resolveVariable(vm: VirtualMachine, name: string): Value {
    for (let i = vm.getState().scopes.length - 1; i >= 0; i--) {
      const scope = vm.getState().scopes[i];
      if (scope.variables.has(name)) {
        return scope.variables.get(name)!;
      }
    }
    return { type: 'undefined' };
  }

  private assignVariable(vm: VirtualMachine, name: string, value: Value): void {
    for (let i = vm.getState().scopes.length - 1; i >= 0; i--) {
      const scope = vm.getState().scopes[i];
      if (scope.variables.has(name)) {
        scope.variables.set(name, value);
        return;
      }
    }
    vm.getCurrentScope().variables.set(name, value);
  }

  generateDynamicHandlers(seed: number): void {
    if (this.generatedHandlers) return;
    this.generatedHandlers = true;
  }
}
