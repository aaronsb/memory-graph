import { MemoryStorage, StorageType } from './MemoryStorage.js';
import { JsonMemoryStorage } from './JsonMemoryStorage.js';
import { SqliteMemoryStorage } from './SqliteMemoryStorage.js';
import { MariaDbMemoryStorage } from './MariaDbMemoryStorage.js';
import type { PoolOptions } from 'mysql2/promise';

/**
 * Factory for creating storage implementations
 */
export class StorageFactory {
  /**
   * Create a storage implementation based on the specified type
   * @param type Storage type
   * @param storageDir Storage directory
   * @param dbConfig Optional database configuration for MariaDB
   * @returns Storage implementation
   */
  static createStorage(type: StorageType, storageDir: string, dbConfig?: PoolOptions): MemoryStorage {
    switch (type) {
      case StorageType.JSON:
        return new JsonMemoryStorage(storageDir);
      case StorageType.SQLITE:
        return new SqliteMemoryStorage(storageDir);
      case StorageType.MARIADB:
        return new MariaDbMemoryStorage(storageDir, dbConfig);
      default:
        throw new Error(`Unknown storage type: ${type}`);
    }
  }
}
