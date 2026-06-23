import { BuildConfig } from '../utils/types';
import { BuildRandomizer } from './randomizer';
import { CryptoUtils } from '../utils/crypto';

export class BuildGenerator {
  private randomizer: BuildRandomizer;

  constructor() {
    this.randomizer = new BuildRandomizer();
  }

  generateBuildConfig(): BuildConfig {
    return {
      keys: this.generateKeys(),
      opcodeMapping: this.randomizer.generateOpcodeMapping(),
      alphabet: this.randomizer.generateAlphabet(),
      xorKey: this.randomizer.generateStringKey(),
      dispatcherSeed: this.randomizer.generateDispatcherSeed(),
    };
  }

  generateKeys() {
    return {
      hmacKey: CryptoUtils.randomHex(64),
      aesKey: CryptoUtils.randomHex(32),
      signatureKey: CryptoUtils.randomHex(48),
    };
  }

  generateVMStub(config: BuildConfig): string {
    return `
(function(){
var A=${JSON.stringify(Array.from(config.xorKey))};
var B=${config.dispatcherSeed};
var C=${JSON.stringify(config.alphabet)};
var D=${JSON.stringify(this.serializeMapping(config.opcodeMapping))};
return {key:A,seed:B,alphabet:C,mapping:D};
})()`;
  }

  generateLoader(): string {
    return `
(function(){
var r=function(s){return typeof atob!=='undefined'?atob(s):Buffer.from(s,'base64').toString('binary')};
var d=function(e,k){var o='';for(var i=0;i<e.length;i++){o+=String.fromCharCode(e.charCodeAt(i)^k.charCodeAt(i%k.length))}return o};
var b=function(a){var r=[];for(var i=0;i<a.length;i+=2){r.push(parseInt(a.substr(i,2),16))}return r};
return {decode:d,base64:r,bin:b};
})()`;
  }

  private serializeMapping(mapping: Map<number, number>): [number, number][] {
    return Array.from(mapping.entries());
  }

  generateBuildId(): string {
    return this.randomizer.generateBuildId();
  }
}
