const fs = require('fs-extra');
const path = require('path');
const fileManager = require('./fileManager');
const firebaseDB = require('./firebaseDatabase');

class CityManager {
  constructor() {
    this.citiesFile = 'cities.json';
    this.firebaseDB = null;
    this.categories = [
      { id: 1, name: 'Рестораны и кафе', icon: '🍽️' },
      { id: 2, name: 'Музеи и галереи', icon: '🏛️' },
      { id: 3, name: 'Парки и скверы', icon: '🌳' },
      { id: 4, name: 'Развлечения', icon: '🎭' },
      { id: 5, name: 'Магазины', icon: '🛍️' },
      { id: 6, name: 'Отели', icon: '🏨' },
      { id: 7, name: 'Спорт', icon: '⚽' },
      { id: 8, name: 'Театры', icon: '🎭' },
      { id: 9, name: 'Кинотеатры', icon: '🎬' },
      { id: 10, name: 'Торговые центры', icon: '🏬' }
    ];
    this.citiesDir = path.join(__dirname, '..', 'data', 'cities');
    this.dataDir = path.join(__dirname, '..', 'data');
    fs.ensureDirSync(this.citiesDir);
    fs.ensureDirSync(this.dataDir);
  }

  setFirebaseDB(firebaseDB) {
    this.firebaseDB = firebaseDB;
    console.log('✅ Firebase Database подключена к CityManager');
  }

  // Получить путь к файлу города (для резервных копий)
  getCityFilePath(cityName) {
    const fileName = fileManager.generateCityFileName(cityName);
    
    const citiesDirPath = path.join(this.citiesDir, fileName);
    const dataDirPath = path.join(this.dataDir, fileName);
    
    if (fs.existsSync(citiesDirPath)) {
      return citiesDirPath;
    } else if (fs.existsSync(dataDirPath)) {
      return dataDirPath;
    }
    
    return citiesDirPath;
  }

  // 🔥 ПРИОРИТЕТ FIREBASE: Получить данные города
async getCityData(cityName) {
  try {
    console.log(`📂 [getCityData] Получаю данные города: "${cityName}"`);
    
    // ✅ ПРИОРИТЕТ 1: Firebase
    if (this.firebaseDB && this.firebaseDB.initialized) {
      console.log(`🔥 Пробую получить из Firebase...`);
      try {
        const firebaseData = await this.getCityDataFromFirebase(cityName);
        if (firebaseData) {
          console.log(`✅ [FIREBASE] Данные города получены`);
          return firebaseData;
        }
      } catch (fbError) {
        console.error(`❌ Firebase ошибка:`, fbError.message);
      }
    } else {
      console.warn('⚠️ Firebase не инициализирован, используется локальный файл');
    }
    
    // ⚠️ FALLBACK: Локальные файлы
    console.log(`📁 Загружаю город "${cityName}" из локального файла`);
    const fileName = fileManager.generateCityFileName(cityName);
    const data = await fileManager.readJSON(fileName);
    
    console.log(`📊 [DEBUG] Содержимое файла "${fileName}":`, {
      hasData: !!data,
      keys: data ? Object.keys(data) : [],
      hasPlaces: data && !!data.places,
      placesCount: data && data.places ? (Array.isArray(data.places) ? data.places.length : Object.keys(data.places).length) : 0
    });
    
    return data;
    
  } catch (error) {
    console.error(`❌ [getCityData] Ошибка для города "${cityName}":`, error);
    return null;
  }
}

  // 🔥 ПРИОРИТЕТ FIREBASE: Сохранить данные города
  async saveCityData(cityName, cityData) {
    try {
      // Обновляем время изменения
      cityData.updatedAt = new Date().toISOString();
      
      console.log(`💾 Сохраняю данные города "${cityName}" (${cityData.places?.length || 0} мест)`);
      
      // ✅ ПРИОРИТЕТ 1: Сохраняем в Firebase
      if (this.firebaseDB && this.firebaseDB.initialized) {
        console.log(`🔥 [ПРИОРИТЕТ] Сохраняю город "${cityName}" в Firebase...`);
        
        const cityId = this.generateCityId(cityName);
        const firebaseResult = await this.firebaseDB.saveCity(cityId, cityData);
        
        if (firebaseResult && firebaseResult.success) {
          console.log(`✅ [FIREBASE] Город "${cityName}" сохранен`);
          
          // Сохраняем локальную резервную копию
          const cityFilePath = this.getCityFilePath(cityName);
          await fs.writeJson(cityFilePath, cityData, { spaces: 2 });
          console.log(`📁 Резервная копия сохранена локально`);
          
          return { success: true };
        }
      }
      
      // ⚠️ FALLBACK: Сохраняем только локально
      console.warn(`⚠️ Firebase недоступен, сохраняю город "${cityName}" только локально`);
      const cityFilePath = this.getCityFilePath(cityName);
      await fs.writeJson(cityFilePath, cityData, { spaces: 2 });
      
      return { 
        success: true, 
        message: 'Сохранено локально (Firebase недоступен)' 
      };
      
    } catch (error) {
      console.error('❌ Ошибка при сохранении данных города:', error);
      return { success: false, message: error.message };
    }
  }

  // 🔥 ПРИОРИТЕТ FIREBASE: Получить все города
async getAllCities() {
  console.log('🔥 [cityManager] getAllCities: Начинаю получение городов...');
  
  try {
    // ✅ ПРИОРИТЕТ 1: Firebase
    if (this.firebaseDB && this.firebaseDB.initialized) {
      console.log('🔥 [cityManager] Использую Firebase...');
      const citiesRef = this.firebaseDB.db.ref('cities');
      const snapshot = await citiesRef.once('value');
      const data = snapshot.val();
      
      console.log('🔥 [cityManager] Данные из Firebase:', data);
      
      if (!data) {
        console.log('📭 Firebase пуст, проверяю локальные файлы...');
        // Переходим к локальным файлам
      } else {
        // Получаем названия городов из Firebase
        const cityNames = Object.values(data).map(city => city.name).filter(Boolean);
        console.log('🔥 [cityManager] Города из Firebase:', cityNames);
        
        // 🔄 Если есть локальные города, отсутствующие в Firebase, синхронизируем их
        const localCities = await this.getLocalCities();
        if (localCities && localCities.length > 0) {
          await this.syncLocalCitiesToFirebase(localCities);
        }
        
        return cityNames;
      }
    }
    
    // ⚠️ FALLBACK: Локальные файлы
    console.log('📁 Загружаю города из локальных файлов...');
    return await this.getLocalCities();
    
  } catch (error) {
    console.error('🔥 [cityManager] Ошибка при получении городов:', error);
    // При ошибке Firebase, используем локальные файлы
    return await this.getLocalCities();
  }
}

// Новый метод: получить города из локальных файлов
async getLocalCities() {
  try {
    const cities = await fileManager.readJSON(this.citiesFile);
    return cities || [];
  } catch (error) {
    console.error('❌ Ошибка чтения локального файла городов:', error);
    return [];
  }
}

// Новый метод: синхронизировать локальные города в Firebase
async syncLocalCitiesToFirebase(localCities) {
  if (!this.firebaseDB || !this.firebaseDB.initialized || !localCities) {
    return;
  }
  
  console.log(`🔄 Синхронизирую ${localCities.length} локальных городов в Firebase...`);
  
  for (const cityName of localCities) {
    try {
      // Проверяем, есть ли город уже в Firebase
      const cityId = this.generateCityId(cityName);
      const cityRef = this.firebaseDB.db.ref(`cities/${cityId}`);
      const snapshot = await cityRef.once('value');
      
      if (!snapshot.exists()) {
        // Города нет в Firebase, загружаем из локального файла
        const cityFilePath = this.getCityFilePath(cityName);
        if (await fs.pathExists(cityFilePath)) {
          const cityData = await fs.readJson(cityFilePath);
          await this.firebaseDB.saveCity(cityId, cityData);
          console.log(`✅ Синхронизирован город: ${cityName}`);
        }
      }
    } catch (error) {
      console.error(`❌ Ошибка синхронизации города ${cityName}:`, error);
    }
  }
}

// Новый метод: получить города из локальных файлов
async getLocalCities() {
  try {
    const cities = await fileManager.readJSON(this.citiesFile);
    return cities || [];
  } catch (error) {
    console.error('❌ Ошибка чтения локального файла городов:', error);
    return [];
  }
}

// Новый метод: синхронизировать локальные города в Firebase
async syncLocalCitiesToFirebase(localCities) {
  if (!this.firebaseDB || !this.firebaseDB.initialized || !localCities) {
    return;
  }
  
  console.log(`🔄 Синхронизирую ${localCities.length} локальных городов в Firebase...`);
  
  for (const cityName of localCities) {
    try {
      // Проверяем, есть ли город уже в Firebase
      const cityId = this.generateCityId(cityName);
      const cityRef = this.firebaseDB.db.ref(`cities/${cityId}`);
      const snapshot = await cityRef.once('value');
      
      if (!snapshot.exists()) {
        // Города нет в Firebase, загружаем из локального файла
        const cityFilePath = this.getCityFilePath(cityName);
        if (await fs.pathExists(cityFilePath)) {
          const cityData = await fs.readJson(cityFilePath);
          await this.firebaseDB.saveCity(cityId, cityData);
          console.log(`✅ Синхронизирован город: ${cityName}`);
        }
      }
    } catch (error) {
      console.error(`❌ Ошибка синхронизации города ${cityName}:`, error);
    }
  }
}

  // 🔥 ПРИОРИТЕТ FIREBASE: Добавить город
async addCity(cityName, options = {}) {
  try {
    console.log(`➕ Добавляю город: "${cityName}"`);
    
    // Получаем список городов
    const cities = await this.getAllCities();
    
    // Проверяем, существует ли город
    if (cities.includes(cityName)) {
      return {
        success: false,
        message: `Город "${cityName}" уже существует`
      };
    }
    
    // Добавляем город в список
    cities.push(cityName);
    
    // ✅ ПРИОРИТЕТ 1: Сохраняем в Firebase
    if (this.firebaseDB && this.firebaseDB.initialized) {
      console.log('🔥 [ПРИОРИТЕТ] Сохраняю город в Firebase...');
      try {
        const cityId = this.generateCityId(cityName);
        const cityData = {
          name: cityName,
          places: [],  // ✅ ВАЖНО: создаем пустой массив places
          photo: options.photoUrl ? {
            url: options.photoUrl,
            fileName: options.photoFileName,
            telegramFileId: options.photoFileId
          } : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        await this.firebaseDB.db.ref(`cities/${cityId}`).set(cityData);
        console.log('✅ [FIREBASE] Город сохранен');
      } catch (firebaseError) {
        console.error('❌ Ошибка сохранения в Firebase:', firebaseError.message);
      }
    }
    
    // ⚠️ FALLBACK: Сохраняем локально
    console.log('📁 Сохраняю город локально...');
    
    // Сохраняем список городов
    await fileManager.writeJSON('cities.json', cities);
    
    // ✅ ВАЖНО: Создаем файл города с правильной структурой
    const cityFileName = fileManager.generateCityFileName(cityName);
    const cityData = {
      name: cityName,
      places: [],  // ✅ ВАЖНО: создаем пустой массив places
      photo: options.photoUrl ? {
        url: options.photoUrl,
        fileName: options.photoFileName,
        telegramFileId: options.photoFileId
      } : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await fileManager.writeJSON(cityFileName, cityData);
    console.log(`✅ Создан файл города: ${cityFileName}`);
    
    return {
      success: true,
      message: `Город "${cityName}" успешно добавлен`,
      cityName: cityName,
      fileName: cityFileName
    };
    
  } catch (error) {
    console.error('❌ Ошибка при добавлении города:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

  // 🔥 ПРИОРИТЕТ FIREBASE: Удалить город
  async removeCity(cityName) {
    try {
      const cities = await this.getAllCities();
      const index = cities.indexOf(cityName);
      
      if (index === -1) {
        return { success: false, message: 'Город не найден' };
      }
      
      // ✅ ПРИОРИТЕТ 1: Удаляем из Firebase
      if (this.firebaseDB && this.firebaseDB.initialized) {
        console.log(`🔥 [ПРИОРИТЕТ] Удаляю город "${cityName}" из Firebase...`);
        
        const cityId = this.generateCityId(cityName);
        const firebaseResult = await this.firebaseDB.deleteCity(cityId);
        
        if (firebaseResult && firebaseResult.success) {
          console.log(`✅ [FIREBASE] Город "${cityName}" удален`);
          
          // Удаляем локальную копию
          const cityFilePath = this.getCityFilePath(cityName);
          await fs.remove(cityFilePath);
          
          // Удаляем из списка
          cities.splice(index, 1);
          await fileManager.writeJSON(this.citiesFile, cities);
          
          console.log(`🗑️ Город ${cityName} полностью удален`);
          return { success: true, message: 'Город удален' };
        }
      }
      
      // ⚠️ FALLBACK: Удаляем только локально
      console.warn(`⚠️ Firebase недоступен, удаляю город "${cityName}" только локально`);
      
      const cityFilePath = this.getCityFilePath(cityName);
      await fs.remove(cityFilePath);
      cities.splice(index, 1);
      await fileManager.writeJSON(this.citiesFile, cities);
      
      console.log(`🗑️ Город ${cityName} удален локально`);
      return { 
        success: true, 
        message: 'Город удален локально (Firebase недоступен)' 
      };
      
    } catch (error) {
      console.error('❌ Ошибка при удалении города:', error);
      return { success: false, message: 'Ошибка при удалении города' };
    }
  }

  // Проверить существование города
  async cityExists(cityName) {
    const cities = await this.getAllCities();
    return cities.includes(cityName);
  }

  // Получить все категории
  getCategories() {
    return this.categories;
  }

  // Получить категорию по ID
  getCategoryById(categoryId) {
    return this.categories.find(cat => cat.id == categoryId) || { name: 'Неизвестно', icon: '📁' };
  }

  // Поиск городов по названию
  async searchCities(query) {
    const cities = await this.getAllCities();
    const lowercaseQuery = query.toLowerCase();
    
    return cities.filter(city => 
      city.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Вспомогательный метод: генерация ID города для Firebase
  generateCityId(cityName) {
    // Преобразуем название в безопасный ID
    return cityName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }
}

module.exports = new CityManager();