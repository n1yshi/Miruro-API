import { IntegrityCheckResult, IntegrityCheck } from '../utils/types';

export class RuntimeIntegrityChecker {
  private checks: IntegrityCheck[] = [];

  verify(): IntegrityCheckResult {
    this.checks = [];

    this.checkFunctionIntegrity();
    this.checkPrototypeIntegrity();
    this.checkNativeFunctions();
    this.checkGlobalIntegrity();
    this.checkConsoleIntegrity();

    const passed = this.checks.every(c => c.passed);
    const overallScore = this.calculateScore();

    return {
      passed,
      checks: [...this.checks],
      overallScore,
      timestamp: Date.now()
    };
  }

  private checkFunctionIntegrity(): void {
    try {
      const toString = Function.prototype.toString;
      const nativeCode = 'function () { [native code] }';

      const testFn = function() {};
      const testStr = testFn.toString();

      this.checks.push({
        name: 'function_toString',
        passed: true,
        details: 'Function toString appears normal',
        severity: 'high'
      });
    } catch {
      this.checks.push({
        name: 'function_toString',
        passed: false,
        details: 'Function toString may be modified',
        severity: 'critical'
      });
    }

    const setTimeoutStr = setTimeout.toString();
    const isNative = /native code/.test(setTimeoutStr);

    this.checks.push({
      name: 'native_function_check',
      passed: isNative,
      details: isNative ? 'Native functions intact' : 'Native functions may be hooked',
      severity: 'critical'
    });
  }

  private checkPrototypeIntegrity(): void {
    const checks = [
      { name: 'Object.prototype', obj: Object.prototype, props: ['hasOwnProperty', 'toString', 'valueOf'] },
      { name: 'Array.prototype', obj: Array.prototype, props: ['push', 'pop', 'slice', 'map', 'filter'] },
      { name: 'String.prototype', obj: String.prototype, props: ['charAt', 'slice', 'indexOf', 'replace'] },
      { name: 'Function.prototype', obj: Function.prototype, props: ['call', 'apply', 'bind'] },
    ];

    for (const check of checks) {
      let allClean = true;
      const details: string[] = [];

      for (const prop of check.props) {
        const descriptor = Object.getOwnPropertyDescriptor(check.obj, prop);
        if (!descriptor) {
          details.push(`${prop}: missing`);
          allClean = false;
          continue;
        }

        if (!descriptor.configurable) {
          continue;
        }

        if (descriptor.get || descriptor.set) {
          if (typeof descriptor.get === 'function') {
            const getStr = descriptor.get.toString();
            if (!/native code/.test(getStr)) {
              details.push(`${prop}: getter may be modified`);
              allClean = false;
            }
          }
        }
      }

      this.checks.push({
        name: `prototype_${check.name}`,
        passed: allClean,
        details: details.length > 0 ? details.join('; ') : `${check.name} intact`,
        severity: 'high'
      });
    }
  }

  private checkNativeFunctions(): void {
    const natives = [
      { name: 'JSON.parse', fn: JSON.parse },
      { name: 'JSON.stringify', fn: JSON.stringify },
      { name: 'Array.isArray', fn: Array.isArray },
      { name: 'Object.keys', fn: Object.keys },
      { name: 'Object.defineProperty', fn: Object.defineProperty },
    ];

    for (const native of natives) {
      const str = native.fn.toString();
      const isNative = /native code/.test(str);

      if (!isNative) {
        this.checks.push({
          name: `native_${native.name}`,
          passed: false,
          details: `${native.name} may be monkey-patched`,
          severity: 'critical'
        });
      }
    }
  }

  private checkGlobalIntegrity(): void {
    if (typeof window === 'undefined') return;

    const globals = ['document', 'window', 'navigator', 'location'];
    for (const g of globals) {
      const desc = Object.getOwnPropertyDescriptor(window, g);
      if (desc && desc.get) {
        const getStr = desc.get.toString();
        if (getStr.includes('native')) {
        } else {
          this.checks.push({
            name: `global_${g}`,
            passed: false,
            details: `${g} getter may be modified`,
            severity: 'high'
          });
        }
      }
    }
  }

  private checkConsoleIntegrity(): void {
    if (typeof console === 'undefined') return;

    const methods = ['log', 'warn', 'error', 'info', 'debug'];
    for (const method of methods) {
      const fn = (console as any)[method];
      if (typeof fn === 'function') {
        const str = fn.toString();
        if (!str.includes('native code') && str.length > 100) {
          this.checks.push({
            name: `console_${method}`,
            passed: false,
            details: `console.${method} may be wrapped`,
            severity: 'medium'
          });
        }
      }
    }
  }

  private calculateScore(): number {
    if (this.checks.length === 0) return 1;

    let totalWeight = 0;
    let weightedScore = 0;

    for (const check of this.checks) {
      const weight = check.severity === 'critical' ? 4
        : check.severity === 'high' ? 3
        : check.severity === 'medium' ? 2
        : 1;

      totalWeight += weight;
      weightedScore += check.passed ? weight : 0;
    }

    return totalWeight > 0 ? weightedScore / totalWeight : 1;
  }

  getChecks(): IntegrityCheck[] {
    return [...this.checks];
  }
}
