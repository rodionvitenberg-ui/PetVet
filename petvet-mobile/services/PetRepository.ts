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