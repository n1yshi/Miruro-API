import { OpcodeDefinitions } from '../vm/opcodes';

export class BuildRandomizer {
  generateOpcodeMapping(): Map<number, number> {
    const defs = OpcodeDefinitions.getAllDefinitions();
    const ids = defs.map(d => d.id);
    const shuffled = this.shuffleArray([...ids]);

    const mapping = new Map<number, number>();
    for (let i = 0; i < ids.length; i++) {
      mapping.set(shuffled[i], ids[i]);
    }

    return mapping;
  }

  generateDispatcherSeed(): number {
    return Math.floor(Math.random() * 0xFFFFFFFF);
  }

  generateAlphabet(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
    return this.shuffleArray(chars.split('')).join('').slice(0, 64);
  }

  generateStringKey(): Uint8Array {
    const key = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      key[i] = Math.floor(Math.random() * 256);
    }
    return crypto.getRandomValues(key);
  }

  generateBuildId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `AEGIS-${timestamp}-${random}`;
  }

  randomizePropertyName(original: string): string {
    const prefix = '_' + Math.random().toString(36).substring(2, 6);
    return prefix + original;
  }

  generateDeadCode(count: number): string[] {
    const deadCodes: string[] = [];

    for (let i = 0; i < count; i++) {
      const varName = `_dead_${i}_${Math.random().toString(36).substring(2, 6)}`;
      const value = Math.floor(Math.random() * 1000);

      const patterns = [
        `var ${varName}=${value};void(${varName});`,
        `var ${varName}=function(){return ${value}};${varName}();`,
        `void(function(){var ${varName}=${value};return ${varName}})();`,
        `try{var ${varName}=${value}}catch(e){}`,
        `typeof ${varName}!=='undefined'&&(${varName}=${value})`,
      ];

      deadCodes.push(patterns[i % patterns.length]);
    }

    return deadCodes;
  }

  generateVariableName(existingNames: Set<string>): string {
    const length = 6 + Math.floor(Math.random() * 10);
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$';
    let name = '';

    do {
      name = chars[Math.floor(Math.random() * chars.length)];
      const pool = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_$';
      for (let i = 1; i < length; i++) {
        name += pool[Math.floor(Math.random() * pool.length)];
      }
    } while (existingNames.has(name));

    existingNames.add(name);
    return name;
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
