declare module 'sqlite3' {
  export interface Database {
    run(sql: string, params?: any[], callback?: (err: Error | null) => void): this;
    get(sql: string, params?: any[], callback?: (err: Error | null, row: any) => void): this;
    all(sql: string, params?: any[], callback?: (err: Error | null, rows: any[]) => void): this;
    exec(sql: string, callback?: (err: Error | null) => void): this;
    prepare(sql: string, params?: any[], callback?: (err: Error | null, statement: any) => void): any;
    close(callback?: (err: Error | null) => void): void;
  }

  export class Database {
    constructor(filename: string, mode?: number, callback?: (err: Error | null) => void);
  }

  export default {
    Database
  };
}

declare module 'sqlite' {
  import sqlite3 from 'sqlite3';

  export interface Database {
    run(sql: string, params?: any[]): Promise<any>;
    get(sql: string, params?: any[]): Promise<any>;
    all(sql: string, params?: any[]): Promise<any[]>;
    exec(sql: string): Promise<void>;
    prepare(sql: string, params?: any[]): Promise<any>;
    close(): Promise<void>;
  }

  export interface OpenOptions {
    filename: string;
    driver: any;
    mode?: number;
  }

  export function open(options: OpenOptions): Promise<Database>;
}
