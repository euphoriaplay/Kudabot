const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

class FirebaseDatabase {
  constructor() {
    this.initialized = false;
    this.db = null;
    this.isFirebaseFirst = true; // ✅ РЕЖИМ: Firebase главный
    
    try {
      const admin = require('firebase-admin');
      const serviceAccount = require('../serviceAccountKey.json');
      
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: "https://help-tasc-progect-default-rtdb.europe-west1.firebasedatabase.app"
        });
      }
      
      this.db = admin.database();
      this.initialized = true;
      console.log('✅ Firebase Database инициализирован (Firebase-First режим)');
    } catch (error) {
      console.error('❌ Ошибка инициализации Firebase:', error.message);
      this.initialized = false;
    }
  }

  // ============ ГОРОДА ============
  
  async getAllCities() {
    if (!this.initialized) {
      throw new Error('Firebase не инициализирован');
    }
    
    try {
      const snapshot = await this.db.ref('cities').once('value');
      const data = snapshot.val();
      
      if (!data) {
        console.log('📭 Нет городов в Firebase');
        return [];
      }
      
      const cities = Object.keys(data);
      console.log(`✅ Загружено ${cities.length} городов из Firebase`);
      return cities;
    } catch (error) {
      console.error('❌ Ошибка загрузки городов:', error.message);
      throw error;
    }
  }

  async getCityData(cityName) {
    if (!this.initialized) {
      throw new Error('Firebase не инициализирован');
    }
    
    try {
      const snapshot = await this.db.ref(`cities/${cityName}`).once('value');
      const data = snapshot.val();
      
      if (!data) {
        return { places: [], photo: null };
      }
      
      return data;
    } catch (error) {
      console.error(`❌ Ошибка загрузки данных города ${cityName}:`, error.message);
      throw error;
    }
  }

  async addCity(cityName, cityData) {
    if (!this.initialized) {
      throw new Error('Firebase не инициализирован');
    }
    
    try {
      // Проверяем, существует ли город
      const exists = await this.cityExists(cityName);
      if (exists) {
        return {
          success: false,
          message: `Город "${cityName}" уже существует в Firebase`
        };
      }
      
      // Добавляем город
      await this.db.ref(`cities/${cityName}`).set({
        places: [],
        photo: cityData.photo || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      console.log(`✅ Город "${cityName}" добавлен в Firebase`);
      
      return {
        success: true,
        message: `Город "${cityName}" добавлен`,
        cityName: cityName
      };
    } catch (error) {
      console.error('❌ Ошибка добавления города:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async removeCity(cityName) {
    if (!this.initialized) {
      throw new Error('Firebase не инициализирован');
    }
    
    try {
      // ✅ ЗАЩИТА: Проверяем, что удаление идет через интерфейс
      console.log(`🗑️ Удаление города "${cityName}" из Firebase (через интерфейс)`);
      
      await this.db.ref(`cities/${cityName}`).remove();
      
      return {
        success: true,
        message: `Город "${cityName}" удален из Firebase`
      };
    } catch (error) {
      console.error('❌ Ошибка удаления города:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async cityExists(cityName) {
    if (!this.initialized) {
      return false;
    }
    
    try {
      const snapshot = await this.db.ref(`cities/${cityName}`).once('value');
      return snapshot.exists();
    } catch (error) {
      console.error('❌ Ошибка проверки города:', error.message);
      return false;
    }
  }

  // ============ МЕСТА ============
  
  async getAllPlaces() {
    if (!this.initialized) {
      throw new Error('Firebase не инициализирован');
    }
    
    try {
      const cities = await this.getAllCities();
      const allPlaces = [];
      
      for (const city of cities) {
        const cityData = await this.getCityData(city);
        if (cityData.places && Array.isArray(cityData.places)) {
          allPlaces.push(...cityData.places);
        }
      }
      
      console.log(`✅ Загружено ${allPlaces.length} мест из Firebase`);
      return allPlaces;
    } catch (error) {
      console.error('❌ Ошибка загрузки мест:', error.message);
      throw error;
    }
  }

  async getPlacesByCity(cityName) {
    if (!this.initialized) {
      throw new Error('Firebase не инициализирован');
    }
    
    try {
      const snapshot = await this.db.ref(`cities/${cityName}/places`).once('value');
      const places = snapshot.val();
      
      if (!places) {
        return [];
      }
      
      return Array.isArray(places) ? places : [];
    } catch (error) {
      console.error(`❌ Ошибка загрузки мест города ${cityName}:`, error.message);
      throw error;
    }
  }

  async addPlace(cityName, placeData) {
    if (!this.initialized) {
      throw new Error('Firebase не инициализирован');
    }
    
    try {
      const places = await this.getPlacesByCity(cityName);
      
      // Добавляем метаданные
      const newPlace = {
        ...placeData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      places.push(newPlace);
      
      await this.db.ref(`cities/${cityName}/places`).set(places);
      await this.db.ref(`cities/${cityName}/updated_at`).set(new Date().toISOString());
      
      console.log(`✅ Место "${placeData.name}" добавлено в Firebase`);
      
      return {
        success: true,
        place: newPlace
      };
    } catch (error) {
      console.error('❌ Ошибка добавления места:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async updatePlace(cityName, placeId, updateData) {
    if (!this.initialized) {
      throw new Error('Firebase не инициализирован');
    }
    
    try {
      const places = await this.getPlacesByCity(cityName);
      const index = places.findIndex(p => p.id === placeId);
      
      if (index === -1) {
        return {
          success: false,
          message: 'Место не найдено'
        };
      }
      
      // Обновляем место
      places[index] = {
        ...places[index],
        ...updateData,
        updated_at: new Date().toISOString()
      };
      
      await this.db.ref(`cities/${cityName}/places`).set(places);
      await this.db.ref(`cities/${cityName}/updated_at`).set(new Date().toISOString());
      
      console.log(`✅ Место обновлено в Firebase`);
      
      return {
        success: true,
        place: places[index]
      };
    } catch (error) {
      console.error('❌ Ошибка обновления места:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async deletePlace(cityName, placeId) {
    if (!this.initialized) {
      throw new Error('Firebase не инициализирован');
    }
    
    try {
      // ✅ ЗАЩИТА: Проверяем, что удаление идет через интерфейс
      console.log(`🗑️ Удаление места ${placeId} из Firebase (через интерфейс)`);
      
      const places = await this.getPlacesByCity(cityName);
      const filteredPlaces = places.filter(p => p.id !== placeId);
      
      if (places.length === filteredPlaces.length) {
        return {
          success: false,
          message: 'Место не найдено'
        };
      }
      
      await this.db.ref(`cities/${cityName}/places`).set(filteredPlaces);
      await this.db.ref(`cities/${cityName}/updated_at`).set(new Date().toISOString());
      
      return {
        success: true,
        message: 'Место удалено из Firebase'
      };
    } catch (error) {
      console.error('❌ Ошибка удаления места:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // ============ КАТЕГОРИИ ============
  
  async getAllCategories() {
    if (!this.initialized) {
      throw new Error('Firebase не инициализирован');
    }
    
    try {
      const snapshot = await this.db.ref('categories').once('value');
      const data = snapshot.val();
      
      if (!data) {
        return [];
      }
      
      // Преобразуем объект в массив
      const categories = Object.entries(data).map(([id, cat]) => ({
        id,
        ...cat
      }));
      
      console.log(`✅ Загружено ${categories.length} категорий из Firebase`);
      return categories;
    } catch (error) {
      console.error('❌ Ошибка загрузки категорий:', error.message);
      throw error;
    }
  }

  async addCategory(categoryData) {
    if (!this.initialized) {
      throw new Error('Firebase не инициализирован');
    }
    
    try {
      const newCategory = {
        ...categoryData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await this.db.ref(`categories/${categoryData.id}`).set(newCategory);
      
      console.log(`✅ Категория "${categoryData.name}" добавлена в Firebase`);
      
      return {
        success: true,
        category: newCategory
      };
    } catch (error) {
      console.error('❌ Ошибка добавления категории:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async updateCategory(categoryId, updateData) {
    if (!this.initialized) {
      throw new Error('Firebase не инициализирован');
    }
    
    try {
      const snapshot = await this.db.ref(`categories/${categoryId}`).once('value');
      
      if (!snapshot.exists()) {
        return {
          success: false,
          message: 'Категория не найдена'
        };
      }
      
      const updated = {
        ...snapshot.val(),
        ...updateData,
        updated_at: new Date().toISOString()
      };
      
      await this.db.ref(`categories/${categoryId}`).set(updated);
      
      return {
        success: true,
        category: updated
      };
    } catch (error) {
      console.error('❌ Ошибка обновления категории:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async deleteCategory(categoryId) {
    if (!this.initialized) {
      throw new Error('Firebase не инициализирован');
    }
    
    try {
      // ✅ ЗАЩИТА: Проверяем, что удаление идет через интерфейс
      console.log(`🗑️ Удаление категории ${categoryId} из Firebase (через интерфейс)`);
      
      await this.db.ref(`categories/${categoryId}`).remove();
      
      return {
        success: true,
        message: 'Категория удалена из Firebase'
      };
    } catch (error) {
      console.error('❌ Ошибка удаления категории:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // ============ РЕКЛАМА ============
  
  async getAllAds() {
    if (!this.initialized) {
      throw new Error('Firebase не инициализирован');
    }
    
    try {
      const snapshot = await this.db.ref('ads').once('value');
      const data = snapshot.val();
      
      if (!data) {
        return [];
      }
      
      const ads = Object.entries(data).map(([id, ad]) => ({
        id,
        ...ad
      }));
      
      return ads;
    } catch (error) {
      console.error('❌ Ошибка загрузки рекламы:', error.message);
      throw error;
    }
  }

  async addAd(adData) {
    if (!this.initialized) {
      throw new Error('Firebase не инициализирован');
    }
    
    try {
      const newAd = {
        ...adData,
        created_at: new Date().toISOString(),
        views: 0
      };
      
      await this.db.ref(`ads/${adData.id}`).set(newAd);
      
      return {
        success: true,
        ad: newAd
      };
    } catch (error) {
      console.error('❌ Ошибка добавления рекламы:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async deleteAd(adId) {
    if (!this.initialized) {
      throw new Error('Firebase не инициализирован');
    }
    
    try {
      // ✅ ЗАЩИТА: Проверяем, что удаление идет через интерфейс
      console.log(`🗑️ Удаление рекламы ${adId} из Firebase (через интерфейс)`);
      
      await this.db.ref(`ads/${adId}`).remove();
      
      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Ошибка удаления рекламы:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // ============ БЭКАП В JSON ============
  
  async backupToJSON() {
    if (!this.initialized) {
      throw new Error('Firebase не инициализирован');
    }
    
    try {
      console.log('💾 Создание бэкапа Firebase -> JSON...');
      
      // Получаем все данные
      const snapshot = await this.db.ref().once('value');
      const data = snapshot.val();
      
      const backup = {
        timestamp: new Date().toISOString(),
        data: data
      };
      
      // Сохраняем в JSON файл
      const fs = require('fs');
      const path = require('path');
      const backupDir = path.join(__dirname, '../backups');
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      const filename = `backup_${Date.now()}.json`;
      const filepath = path.join(backupDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
      
      console.log(`✅ Бэкап создан: ${filepath}`);
      
      return {
        success: true,
        filepath: filepath,
        filename: filename
      };
    } catch (error) {
      console.error('❌ Ошибка создания бэкапа:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // ⚠️ ОПАСНЫЙ МЕТОД: Восстановление из JSON
  // Используйте ТОЛЬКО для восстановления после сбоя
  async restoreFromJSON(filepath) {
    if (!this.initialized) {
      throw new Error('Firebase не инициализирован');
    }
    
    try {
      console.warn('⚠️ ВНИМАНИЕ: Восстановление из JSON перезапишет данные Firebase!');
      
      const fs = require('fs');
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      
      // Перезаписываем данные в Firebase
      await this.db.ref().set(data.data);
      
      console.log('✅ Данные восстановлены из JSON');
      
      return {
        success: true,
        message: 'Данные восстановлены'
      };
    } catch (error) {
      console.error('❌ Ошибка восстановления:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = new FirebaseDatabase();