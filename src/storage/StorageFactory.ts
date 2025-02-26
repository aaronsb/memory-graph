import { MemoryStorage, StorageType } from './MemoryStorage.js';
import { JsonMemoryStorage } from './JsonMemoryStorage.js';
import { SqliteMemoryStorage } from './SqliteMemoryStorage.js';

/**
 * Factory for creating storage implementations
 */
export class StorageFactory {
  /**
   * Create a storage implementation based on the specified type
   * @param type Storage type
   * @param storageDir Storage directory
   * @returns Storage implementation
   */
  static createStorage(type: StorageType, storageDir: string): MemoryStorage {
    switch (type) {
      case StorageType.JSON:
        return new JsonMemoryStorage(storageDir);
      case StorageType.SQLITE:
        return new SqliteMemoryStorage(storageDir);
      default:
        throw new Error(`Unknown storage type: ${type}`);
    }
  }
}
