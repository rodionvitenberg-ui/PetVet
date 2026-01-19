// services/PetRepository.ts
import { db } from '../database/init';
// Импортируем твои типы, чтобы подглядывать структуру, 
// хотя для локальной базы у нас свой интерфейс
import { PetBasic } from '../types/pet'; 

export interface LocalPet {
  local_id: number;
  server_id: number | null;
  sync_status: 'created' | 'updated' | 'synced' | 'deleted';
  name: string;
  gender: 'M' | 'F';
  birth_date?: string;
  species?: string;
  breed?: string;
  avatar_path?: string;
}

export const PetRepository = {
  // === READ ===
  getAllPets: async (): Promise<LocalPet[]> => {
    try {
      // Берем всех, кто не помечен как "удален"
      const rows = await db.getAllAsync<LocalPet>(
        `SELECT * FROM pets WHERE sync_status != 'deleted' ORDER BY created_at DESC`
      );
      return rows;
    } catch (e) {
      console.error('Failed to get pets from SQLite:', e);
      return [];
    }
  },

  getUnsyncedPets: async (): Promise<LocalPet[]> => {
    try {
      return await db.getAllAsync<LocalPet>(
        `SELECT * FROM pets WHERE server_id IS NULL AND sync_status != 'deleted'`
      );
    } catch (e) {
      console.error('Error getting unsynced pets:', e);
      return [];
    }
  },

  // [НОВОЕ] Пометить питомца как синхронизированного
  markAsSynced: async (localId: number, serverId: number) => {
    try {
      await db.runAsync(
        `UPDATE pets SET 
           server_id = ?, 
           sync_status = 'synced' 
         WHERE local_id = ?`,
        [serverId, localId]
      );
      console.log(`✅ Pet local_${localId} linked to server_${serverId}`);
    } catch (e) {
      console.error('Error marking pet as synced:', e);
    }
  },
  
  syncServerPets: async (serverPets: PetBasic[]) => {
    try {
      // Используем транзакцию для скорости и надежности
      await db.withTransactionAsync(async () => {
        for (const pet of serverPets) {
          // 1. Проверяем, есть ли уже этот питомец в локальной базе по server_id
          // (В будущем, если user удалил приложение и поставил заново, 
          // у него будет пустая база, и мы создадим всё с нуля)
          const existing = await db.getFirstAsync<{ local_id: number }>(
            'SELECT local_id FROM pets WHERE server_id = ?',
            [pet.id]
          );

          if (existing) {
            // 2a. ОБНОВЛЕНИЕ (UPDATE)
            // Мы доверяем серверу, поэтому перезаписываем локальные данные
            await db.runAsync(
              `UPDATE pets SET 
                 name = ?, 
                 gender = ?, 
                 species = ?, 
                 breed = ?, 
                 birth_date = ?,
                 sync_status = 'synced'
               WHERE local_id = ?`,
              [
                pet.name,
                pet.gender,
                // species нет в PetBasic, но есть в PetDetail. 
                // Если API списка его не возвращает, можно пока поставить 'unknown' или допилить сериалайзер.
                // Пока предположим, что API возвращает или ставим дефолт.
                (pet as any).species || 'unknown', 
                (pet as any).breed || null,
                (pet as any).birth_date || null, // Если API возвращает дату
                existing.local_id
              ]
            );
          } else {
            // 2b. ВСТАВКА (INSERT)
            await db.runAsync(
              `INSERT INTO pets (server_id, name, gender, species, breed, birth_date, sync_status)
               VALUES (?, ?, ?, ?, ?, ?, 'synced')`,
              [
                pet.id,
                pet.name,
                pet.gender,
                (pet as any).species || 'unknown',
                (pet as any).breed || null,
                (pet as any).birth_date || null
              ]
            );
          }
        }
      });
      console.log(`✅ Synced ${serverPets.length} pets from server`);
    } catch (e) {
      console.error('Failed to sync pets:', e);
    }
  },

  // === CREATE ===
  createPet: async (pet: { name: string; gender: 'M' | 'F'; species?: string; birth_date?: string }) => {
    try {
      const result = await db.runAsync(
        `INSERT INTO pets (name, gender, species, birth_date, sync_status) VALUES (?, ?, ?, ?, ?)`,
        [pet.name, pet.gender, pet.species || 'unknown', pet.birth_date || null, 'created']
      );
      return result.lastInsertRowId; // Возвращаем ID нового питомца
    } catch (e) {
      console.error('Failed to create pet in SQLite:', e);
      throw e;
    }
  },

  // === DELETE ===
  deletePet: async (localId: number) => {
    // Мы не удаляем запись физически, а ставим метку "deleted", 
    // чтобы при синхронизации сервер тоже узнал, что надо удалить.
    await db.runAsync(
      `UPDATE pets SET sync_status = 'deleted' WHERE local_id = ?`,
      [localId]
    );
  },

  // === DEBUG: Очистить таблицу (для тестов) ===
  clearAll: async () => {
    await db.runAsync('DELETE FROM pets');
  }
};