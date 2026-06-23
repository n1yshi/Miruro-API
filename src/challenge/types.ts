export const CHALLENGE_TYPES = {
  HASH: 'hash',
  ENTROPY: 'entropy',
  FINGERPRINT: 'fingerprint',
  VM_EXECUTION: 'vm_execution',
  TIMING: 'timing',
} as const;

export const DIFFICULTY_LEVELS = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  EXTREME: 4,
} as const;

export interface HashChallengeData {
  algorithm: string;
  input: string;
  expectedPrefix: string;
}

export interface EntropyChallengeData {
  sampleSize: number;
  sources: string[];
  threshold: number;
}

export interface VmChallengeData {
  bytecodeId: string;
  expectedOutput: string;
  maxTime: number;
}

export interface TimingChallengeData {
  minTime: number;
  maxTime: number;
  tolerance: number;
}
