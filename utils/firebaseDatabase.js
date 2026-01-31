const admin = require('firebase-admin');

class FirebaseDatabase {
  constructor() {
    this.initialized = false;
    this.db = null;
    this.syncInProgress = false;
    
    try {
      const serviceAccount = require('../serviceAccountKey.json');
      
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: "https://help-tasc-progect-default-rtdb.firebaseio.com/"
        });
      }
      
      this.db = admin.database();
      this.initialized = true;
      console.log('✅ Firebase Database инициализирован');
      
      // Автоматически синхронизируем локальные данные при старте
      this.syncAllLocalDataToFirebase();
      
    } catch (error) {
      console.error('❌ Ошибка инициализации Firebase:', error.message);
      this.initialized = false;
    }
  }

  // 🔄 АВТОМАТИЧЕСКАЯ СИНХРОНИЗАЦИЯ ВСЕХ ДАННЫХ
  async syncAllLocalDataToFirebase() {
    if (!this.initialized || this.syncInProgress) return;
    
    try {
      this.syncInProgress = true;
      console.log('🔄 Начинаю автоматическую синхронизацию всех данных в Firebase...');
      
      // Подключаем локальные менеджеры
      const fs = require('fs').promises;
      const path = require('path');
      
      // 1. Синхронизируем города
      await this.syncCitiesFromLocal();
      
      // 2. Синхронизируем категории
      await this.syncCategoriesFromLocal();
      
      // 3. Синхронизируем рекламу
      await this.syncAdsFromLocal();
      
      // 4. Синхронизируем все места из всех городов
      await this.syncAllPlacesFromLocal();
      
      console.log('✅ Автоматическая синхронизация завершена! Все данные в Firebase');
      this.syncInProgress = false;
      
    } catch (error) {
      console.error('❌ Ошибка автоматической синхронизации:', error.message);
      this.syncInProgress = false;
    }
  }

  // Синхронизировать города из локальных файлов
  async syncCitiesFromLocal() {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const fileManager = require('./fileManager');
      
      // Читаем cities.json
      const cities = await fileManager.readJSON('cities.json');
      
      if (!cities || !Array.isArray(cities)) {
        console.log('📭 Локальный файл городов пуст');
        return;
      }
      
      console.log(`🔄 Синхронизирую ${cities.length} городов...`);
      
      for (const cityName of cities) {
        try {
          // Проверяем, есть ли город в Firebase
          const cityId = this.generateCityId(cityName);
          const cityRef = this.db.ref(`cities/${cityId}`);
          const snapshot = await cityRef.once('value');
          
          if (!snapshot.exists()) {
            // Города нет в Firebase, загружаем из локального файла
            const fileName = fileManager.generateCityFileName(cityName);
            const cityData = await fileManager.readJSON(fileName);
            
            if (cityData) {
              await this.saveCity(cityId, cityData);
              console.log(`✅ Город синхронизирован: ${cityName}`);
            }
          }
        } catch (cityError) {
          console.error(`❌ Ошибка синхронизации города ${cityName}:`, cityError.message);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка синхронизации городов:', error.message);
    }
  }

  // Синхронизировать категории из локальных файлов
  async syncCategoriesFromLocal() {
    try {
      // Загружаем стандартные категории из CategoryManager
      const categoryManager = require('./categoryManager');
      const categories = categoryManager.defaultCategories || [
        { id: 1, name: 'Рестораны и кафе', emoji: '🍽️', icon: '🍽️' },
        { id: 2, name: 'Музеи и галереи', emoji: '🏛️', icon: '🏛️' },
        { id: 3, name: 'Парки и скверы', emoji: '🌳', icon: '🌳' },
        { id: 4, name: 'Развлечения', emoji: '🎭', icon: '🎭' },
        { id: 5, name: 'Магазины', emoji: '🛍️', icon: '🛍️' },
        { id: 6, name: 'Отели', emoji: '🏨', icon: '🏨' },
        { id: 7, name: 'Спорт', emoji: '⚽', icon: '⚽' },
        { id: 8, name: 'Театры', emoji: '🎭', icon: '🎭' },
        { id: 9, name: 'Кинотеатры', emoji: '🎬', icon: '🎬' },
        { id: 10, name: 'Торговые центры', emoji: '🏬', icon: '🏬' }
      ];
      
      console.log(`🔄 Синхронизирую ${categories.length} категорий...`);
      
      const categoriesRef = this.db.ref('categories');
      const snapshot = await categoriesRef.once('value');
      const existingCategories = snapshot.val() || {};
      
      if (Object.keys(existingCategories).length === 0) {
        // Firebase пуст, загружаем все категории
        for (const category of categories) {
          await this.saveCategory(category.id.toString(), category);
        }
        console.log('✅ Все категории синхронизированы');
      } else {
        console.log('📚 Категории уже есть в Firebase');
      }
    } catch (error) {
      console.error('❌ Ошибка синхронизации категорий:', error.message);
    }
  }

  // Синхронизировать рекламу из локальных файлов
  async syncAdsFromLocal() {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const adsFilePath = path.join(__dirname, '..', 'data', 'ads.json');
      
      try {
        await fs.access(adsFilePath);
        const data = await fs.readFile(adsFilePath, 'utf8');
        const ads = JSON.parse(data);
        
        if (ads && ads.length > 0) {
          console.log(`🔄 Синхронизирую ${ads.length} рекламных объявлений...`);
          
          const adsRef = this.db.ref('ads');
          const snapshot = await adsRef.once('value');
          const existingAds = snapshot.val() || {};
          
          if (Object.keys(existingAds).length === 0) {
            for (const ad of ads) {
              await this.saveAd(ad.id, ad);
            }
            console.log('✅ Вся реклама синхронизирована');
          }
        }
      } catch (fileError) {
        console.log('📭 Локальный файл рекламы не найден или пуст');
      }
    } catch (error) {
      console.error('❌ Ошибка синхронизации рекламы:', error.message);
    }
  }

  // Синхронизировать все места из всех городов
  async syncAllPlacesFromLocal() {
    try {
      const cityManager = require('./cityManager');
      const fileManager = require('./fileManager');
      
      // Получаем список городов
      const cities = await cityManager.getAllCities();
      
      console.log(`🔄 Синхронизирую места из ${cities.length} городов...`);
      
      let totalPlacesSynced = 0;
      
      for (const cityName of cities) {
        try {
          // Читаем локальный файл города
          const fileName = fileManager.generateCityFileName(cityName);
          const cityData = await fileManager.readJSON(fileName);
          
          if (cityData && cityData.places && cityData.places.length > 0) {
            const cityId = this.generateCityId(cityName);
            
            // Проверяем, есть ли места в Firebase
            const cityRef = this.db.ref(`cities/${cityId}/places`);
            const snapshot = await cityRef.once('value');
            const existingPlaces = snapshot.val() || {};
            
            if (Object.keys(existingPlaces).length === 0) {
              // Мест в Firebase нет, синхронизируем все
              for (const place of cityData.places) {
                // Сохраняем место в структуре города
                await cityRef.child(place.id).set(place);
                
                // Также сохраняем в общий список мест для быстрого поиска
                const allPlacesRef = this.db.ref(`places/${place.id}`);
                await allPlacesRef.set({
                  ...place,
                  firebase_city_id: cityId
                });
                
                totalPlacesSynced++;
              }
              console.log(`   ✅ ${cityName}: ${cityData.places.length} мест синхронизированы`);
            }
          }
        } catch (cityError) {
          console.error(`❌ Ошибка синхронизации мест города ${cityName}:`, cityError.message);
        }
      }
      
      if (totalPlacesSynced > 0) {
        console.log(`✅ Всего синхронизировано ${totalPlacesSynced} мест`);
      } else {
        console.log('📚 Места уже синхронизированы с Firebase');
      }
    } catch (error) {
      console.error('❌ Ошибка синхронизации всех мест:', error.message);
    }
  }

  // 🔥 ГОРОДА
  
  async saveCity(cityId, cityData) {
    if (!this.initialized) {
      return { success: false, message: 'Firebase не инициализирован' };
    }
    
    try {
      const cityRef = this.db.ref(`cities/${cityId}`);
      
      const dataToSave = {
        ...cityData,
        firebase_id: cityId,
        updatedAt: new Date().toISOString()
      };
      
      await cityRef.set(dataToSave);
      
      console.log(`✅ Город сохранен в Firebase: ${cityId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Ошибка сохранения города:', error.message);
      return { success: false, message: error.message };
    }
  }

  async deleteCity(cityId) {
    if (!this.initialized) {
      return { success: false, message: 'Firebase не инициализирован' };
    }
    
    try {
      await this.db.ref(`cities/${cityId}`).remove();
      console.log(`✅ Город удален из Firebase: ${cityId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Ошибка удаления города:', error.message);
      return { success: false, message: error.message };
    }
  }

  async getCityData(cityId) {
    if (!this.initialized) {
      return null;
    }
    
    try {
      const snapshot = await this.db.ref(`cities/${cityId}`).once('value');
      return snapshot.val();
    } catch (error) {
      console.error(`❌ Ошибка загрузки города ${cityId}:`, error.message);
      return null;
    }
  }

  async getAllCities() {
    if (!this.initialized) {
      return null;
    }
    
    try {
      const snapshot = await this.db.ref('cities').once('value');
      return snapshot.val();
    } catch (error) {
      console.error('❌ Ошибка получения городов:', error.message);
      return null;
    }
  }

  // 🔥 МЕСТА
  
  async savePlace(placeId, placeData) {
    if (!this.initialized) {
      return { success: false, message: 'Firebase не инициализирован' };
    }
    
    try {
      const cityId = placeData.city_id;
      if (!cityId) {
        return { success: false, message: 'Не указан city_id' };
      }
      
      // Сохраняем в структуре города
      const placeRef = this.db.ref(`cities/${cityId}/places/${placeId}`);
      await placeRef.set(placeData);
      
      // Также сохраняем в общий список мест
      const allPlacesRef = this.db.ref(`places/${placeId}`);
      await allPlacesRef.set({
        ...placeData,
        firebase_city_id: cityId
      });
      
      console.log(`✅ Место сохранено в Firebase: ${placeId} в городе ${cityId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Ошибка сохранения места:', error.message);
      return { success: false, message: error.message };
    }
  }

  async getPlace(placeId) {
    if (!this.initialized) {
      return null;
    }
    
    try {
      const snapshot = await this.db.ref(`places/${placeId}`).once('value');
      return snapshot.val();
    } catch (error) {
      console.error('❌ Ошибка получения места:', error.message);
      return null;
    }
  }

  async deletePlace(placeId) {
    if (!this.initialized) {
      return { success: false, message: 'Firebase не инициализирован' };
    }
    
    try {
      const place = await this.getPlace(placeId);
      if (!place) {
        return { success: false, message: 'Место не найдено' };
      }
      
      const cityId = place.city_id || place.firebase_city_id;
      
      if (cityId) {
        await this.db.ref(`cities/${cityId}/places/${placeId}`).remove();
      }
      
      await this.db.ref(`places/${placeId}`).remove();
      
      console.log(`✅ Место удалено из Firebase: ${placeId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Ошибка удаления места:', error.message);
      return { success: false, message: error.message };
    }
  }

  async getAllPlaces() {
    if (!this.initialized) {
      return [];
    }
    
    try {
      const snapshot = await this.db.ref('places').once('value');
      const placesObj = snapshot.val();
      
      if (!placesObj) {
        return [];
      }
      
      return Object.values(placesObj);
    } catch (error) {
      console.error('❌ Ошибка получения всех мест:', error.message);
      return [];
    }
  }

  async getCityPlaces(cityId) {
    if (!this.initialized) {
      return [];
    }
    
    try {
      const snapshot = await this.db.ref(`cities/${cityId}/places`).once('value');
      const placesObj = snapshot.val();
      
      if (!placesObj) {
        return [];
      }
      
      return Object.values(placesObj);
    } catch (error) {
      console.error(`❌ Ошибка получения мест города ${cityId}:`, error.message);
      return [];
    }
  }

  // 🔥 КАТЕГОРИИ
  
  async getAllCategories() {
    if (!this.initialized) {
      return [];
    }
    
    try {
      const snapshot = await this.db.ref('categories').once('value');
      const categoriesObj = snapshot.val();
      
      if (!categoriesObj) {
        return [];
      }
      
      return Object.values(categoriesObj);
    } catch (error) {
      console.error('❌ Ошибка получения категорий:', error.message);
      return [];
    }
  }

  async saveCategory(categoryId, categoryData) {
    if (!this.initialized) {
      return { success: false, message: 'Firebase не инициализирован' };
    }
    
    try {
      const categoryRef = this.db.ref(`categories/${categoryId}`);
      
      await categoryRef.set({
        ...categoryData,
        firebase_id: categoryId,
        createdAt: categoryData.createdAt || new Date().toISOString()
      });
      
      console.log(`✅ Категория сохранена в Firebase: ${categoryData.name}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Ошибка сохранения категории:', error.message);
      return { success: false, message: error.message };
    }
  }

  async addCategory(categoryData) {
    return await this.saveCategory(categoryData.id, categoryData);
  }

  async updateCategory(categoryId, categoryData) {
    if (!this.initialized) {
      return { success: false, message: 'Firebase не инициализирован' };
    }
    
    try {
      const categoryRef = this.db.ref(`categories/${categoryId}`);
      await categoryRef.update(categoryData);
      
      console.log(`✅ Категория обновлена в Firebase: ${categoryId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Ошибка обновления категории:', error.message);
      return { success: false, message: error.message };
    }
  }

  async deleteCategory(categoryId) {
    if (!this.initialized) {
      return { success: false, message: 'Firebase не инициализирован' };
    }
    
    try {
      await this.db.ref(`categories/${categoryId}`).remove();
      console.log(`✅ Категория удалена из Firebase: ${categoryId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Ошибка удаления категории:', error.message);
      return { success: false, message: error.message };
    }
  }

  // 🔥 РЕКЛАМА
  
  async getAllAds() {
    if (!this.initialized) {
      return [];
    }
    
    try {
      const snapshot = await this.db.ref('ads').once('value');
      const adsObj = snapshot.val();
      
      if (!adsObj) {
        return [];
      }
      
      return Object.values(adsObj);
    } catch (error) {
      console.error('❌ Ошибка получения рекламы:', error.message);
      return [];
    }
  }

  async saveAd(adId, adData) {
    if (!this.initialized) {
      return { success: false, message: 'Firebase не инициализирован' };
    }
    
    try {
      const adRef = this.db.ref(`ads/${adId}`);
      await adRef.set(adData);
      
      console.log(`✅ Реклама сохранена в Firebase: ${adId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Ошибка сохранения рекламы:', error.message);
      return { success: false, message: error.message };
    }
  }

  async deleteAd(adId) {
    if (!this.initialized) {
      return { success: false, message: 'Firebase не инициализирован' };
    }
    
    try {
      await this.db.ref(`ads/${adId}`).remove();
      console.log(`✅ Реклама удалена из Firebase: ${adId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Ошибка удаления рекламы:', error.message);
      return { success: false, message: error.message };
    }
  }

  async syncAdsToFirebase(ads) {
    if (!this.initialized) {
      return { success: false, message: 'Firebase не инициализирован' };
    }
    
    try {
      const adsRef = this.db.ref('ads');
      
      const adsObj = {};
      ads.forEach(ad => {
        adsObj[ad.id] = ad;
      });
      
      await adsRef.set(adsObj);
      console.log(`✅ Синхронизировано ${ads.length} рекламных объявлений в Firebase`);
      return { success: true, count: ads.length };
    } catch (error) {
      console.error('❌ Ошибка синхронизации рекламы:', error.message);
      return { success: false, message: error.message };
    }
  }

  // 🔥 СТАТИСТИКА
  
  async getStats() {
    if (!this.initialized) {
      return null;
    }
    
    try {
      const [cities, places, categories, ads] = await Promise.all([
        this.getAllCities(),
        this.getAllPlaces(),
        this.getAllCategories(),
        this.getAllAds()
      ]);
      
      return {
        cities: cities ? Object.keys(cities).length : 0,
        places: places.length,
        categories: categories.length,
        ads: ads.length,
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Ошибка получения статистики:', error.message);
      return null;
    }
  }

  // 🔥 ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  
  generateCityId(cityName) {
    return cityName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  // ФОРСИРОВАННАЯ СИНХРОНИЗАЦИЯ (ручной запуск)
  async forceSync() {
    console.log('🚀 Запускаю принудительную синхронизацию...');
    await this.syncAllLocalDataToFirebase();
    return { success: true, message: 'Синхронизация запущена' };
  }
}

module.exports = new FirebaseDatabase();