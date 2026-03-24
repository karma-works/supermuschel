export interface SandboxZones {
  writable: string[];
  readOnly: string[];
  blocked: string[];
}

export interface FileEvent {
  type: 'write' | 'blocked';
  path: string;
  ts: number;
}
