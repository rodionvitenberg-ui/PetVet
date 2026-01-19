// api/pets.ts
import { apiClient } from './client';
import { PetBasic } from '../types/pet'; // Твои типы

export const petsApi = {
  // Получить список моих питомцев
  getMyPets: async (): Promise<PetBasic[]> => {
    try {
      const response = await apiClient.get('/api/pets/');
      return response.data;
    } catch (error) {
      console.error('API Error fetch pets:', error);
      throw error;
    }
  },
  createPet: async (petData: { 
    name: string; 
    gender?: string; 
    birth_date?: string; 
    category?: string; // Бэкенд скорее всего ждет category, а не species
  }): Promise<PetBasic> => {
    try {
      // Отправляем POST запрос
      const response = await apiClient.post('/api/pets/', petData);
      return response.data;
    } catch (error) {
      console.error('API Create Pet Error:', error);
      throw error;
    }
  },
};
