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

async getAllCitiesFromFirebase() {
  try {
    if (!this.firebaseDB || !this.firebaseDB.initialized) {
      console.log('⚠️ Firebase не инициализирован в getAllCitiesFromFirebase');
      return [];
    }
    
    console.log('🔥 Читаю cities из Firebase...');
    const citiesRef = this.firebaseDB.db.ref('cities');
    const snapshot = await citiesRef.once('value');
    const citiesData = snapshot.val();
    
    console.log(`📊 [DEBUG Firebase raw data]:`, citiesData);
    
    if (!citiesData) {
      console.log('📭 Нет городов в Firebase');
      return [];
    }
    
    const cities = [];
    
    // ✅ СПИСОК КЛЮЧЕЙ, КОТОРЫЕ НУЖНО ПРОПУСТИТЬ
    const skipKeys = [
      'created_at', 'updated_at', 'createdAt', 'updatedAt',
      'places',  // ✅ ДОБАВЛЕНО: пропускаем ключ places
      'photo', 'photos',
      'name', 'description'
    ];
    
    for (const [key, value] of Object.entries(citiesData)) {
      console.log(`🔍 [DEBUG] Ключ: "${key}", Тип значения: ${typeof value}`);
      
      // ✅ ФИЛЬТР 1: Пропускаем служебные ключи
      if (skipKeys.includes(key)) {
        console.log(`  ⏭️ Пропускаю служебное поле: "${key}"`);
        continue;
      }
      
      // ✅ ФИЛЬТР 2: Пропускаем значения-даты
      if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        console.log(`  ⏭️ Пропускаю дату: "${value}"`);
        continue;
      }
      
      // ✅ ФИЛЬТР 3: Если value - объект с полем name (это город)
      if (value && typeof value === 'object' && value.name) {
        // Проверяем, что name не является датой
        if (typeof value.name === 'string' && !value.name.match(/^\d{4}-\d{2}-\d{2}T/)) {
          cities.push(value.name);
          console.log(`  ✅ Найден город (из объекта): "${value.name}"`);
        }
      }
      // ✅ ФИЛЬТР 4: Если value - обычная строка (не дата, не служебное поле)
      else if (typeof value === 'string' && !value.match(/^\d{4}-\d{2}-\d{2}T/)) {
        cities.push(value);
        console.log(`  ✅ Найден город (строка): "${value}"`);
      }
    }
    
    // Удаляем дубликаты
    const uniqueCities = [...new Set(cities)];
    
    console.log(`✅ Извлечено ${uniqueCities.length} уникальных городов:`, uniqueCities);
    return uniqueCities;
    
  } catch (error) {
    console.error('❌ Ошибка getAllCitiesFromFirebase:', error);
    return [];
  }
}

// Вспомогательный метод для преобразования ID обратно в название
cityIdToName(cityId) {
  // Простое обратное преобразование - берем ID как есть
  // Для более сложной логики можно хранить маппинг
  if (!cityId || cityId === 'unknown') return null;
  
  // Заменяем underscores на пробелы
  const name = cityId.replace(/_/g, ' ');
  
  // Капитализируем первую букву
  return name.charAt(0).toUpperCase() + name.slice(1);
}
async getCityDataFromFirebase(cityName) {
  try {
    if (!this.firebaseDB || !this.firebaseDB.initialized) {
      return null;
    }
    
    const cityId = this.generateCityId(cityName);
    console.log(`🔥 [getCityDataFromFirebase] cityName: "${cityName}", cityId: "${cityId}"`);
    
    const cityRef = this.firebaseDB.db.ref(`cities/${cityId}`);
    const snapshot = await cityRef.once('value');
    const data = snapshot.val();
    
    if (!data) {
      console.log(`📭 Город "${cityName}" не найден в Firebase`);
      return null;
    }
    
    console.log(`✅ Город "${cityName}" найден в Firebase`);
    return data;
    
  } catch (error) {
    console.error(`❌ Ошибка getCityDataFromFirebase для "${cityName}":`, error);
    return null;
  }
}

// Вспомогательный метод для генерации ID города
generateCityId(cityName) {
  const translitMap = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
    'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i',
    'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
    'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
    'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch',
    'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '',
    'э': 'e', 'ю': 'yu', 'я': 'ya',
    ' ': '_', '-': '_', '.': '_', ',': ''
  };
  
  let key = '';
  const cleaned = cityName.trim().toLowerCase();
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (translitMap[char] !== undefined) {
      key += translitMap[char];
    } else if (char.match(/[a-z0-9]/)) {
      key += char;
    } else {
      key += '_';
    }
  }
  
  key = key.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return key.substring(0, 30) || 'unknown';
}

  // 🔥 ПРИОРИТЕТ FIREBASE: Получить все города
async getAllCities() {
  try {
    console.log('🔥 [cityManager] getAllCities: Начинаю получение городов...');
    
    // ✅ ПРИОРИТЕТ 1: Firebase
    if (this.firebaseDB && this.firebaseDB.initialized) {
      console.log('🔥 Пробую получить города из Firebase...');
      try {
        const firebaseCities = await this.getAllCitiesFromFirebase();
        
        console.log(`📊 [DEBUG] Firebase вернул:`, {
          exists: !!firebaseCities,
          isArray: Array.isArray(firebaseCities),
          length: firebaseCities ? firebaseCities.length : 0,
          cities: firebaseCities
        });
        
        if (firebaseCities && firebaseCities.length > 0) {
          console.log(`✅ [FIREBASE] Получено ${firebaseCities.length} городов:`, firebaseCities);
          return firebaseCities;
        }
        
        console.log('📭 Firebase пуст, проверяю локальные файлы...');
      } catch (fbError) {
        console.error('❌ Ошибка Firebase:', fbError.message);
      }
    } else {
      console.warn('⚠️ Firebase не инициализирован');
    }
    
    // ⚠️ FALLBACK: Локальные файлы
    console.log('📁 Загружаю города из локальных файлов...');
    
    const citiesData = await fileManager.readJSON('cities.json');
    
    console.log(`📊 [DEBUG] Локальные данные:`, {
      exists: !!citiesData,
      isArray: Array.isArray(citiesData),
      type: typeof citiesData,
      length: citiesData ? (Array.isArray(citiesData) ? citiesData.length : Object.keys(citiesData).length) : 0,
      data: citiesData
    });
    
    if (!citiesData) {
      console.log('📭 cities.json пуст, возвращаю пустой массив');
      return [];
    }
    
    // Если это массив - возвращаем как есть
    if (Array.isArray(citiesData)) {
      console.log(`✅ Получено ${citiesData.length} городов из локального файла:`, citiesData);
      return citiesData;
    }
    
    // Если это объект - извлекаем значения
    if (typeof citiesData === 'object') {
      const cities = Object.values(citiesData);
      console.log(`✅ Преобразовано ${cities.length} городов из объекта:`, cities);
      return cities;
    }
    
    console.warn('⚠️ Неизвестный формат cities.json');
    return [];
    
  } catch (error) {
    console.error('❌ [getAllCities] Ошибка:', error);
    return [];
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
    
    // ✅ Проверяем, существует ли город УЖЕ в Firebase
    if (this.firebaseDB && this.firebaseDB.initialized) {
      const cityId = this.generateCityId(cityName);
      console.log(`🔍 Проверяю существование города с ID: "${cityId}"`);
      
      const existingCityRef = this.firebaseDB.db.ref(`cities/${cityId}`);
      const snapshot = await existingCityRef.once('value');
      
      if (snapshot.exists()) {
        console.log(`⚠️ Город "${cityName}" уже существует в Firebase с ID: "${cityId}"`);
        return {
          success: false,
          message: `Город "${cityName}" уже существует`
        };
      }
    }
    
    // Получаем список городов из локального файла
    let cities = [];
    try {
      cities = await this.getAllCities();
    } catch (error) {
      console.log('📝 Создаю новый список городов');
      cities = [];
    }
    
    // Проверяем дубликаты
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
        console.log(`🔑 Создаю город с ID: "${cityId}" для города: "${cityName}"`);
        
        const cityData = {
          name: cityName,
          places: {},  // Пустой объект для мест
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        if (options.photoUrl) {
          cityData.photo = {
            url: options.photoUrl,
            fileName: options.photoFileName,
            telegramFileId: options.photoFileId
          };
        }
        
        // ✅ Сохраняем под уникальным ключом cityId
        await this.firebaseDB.db.ref(`cities/${cityId}`).set(cityData);
        console.log(`✅ [FIREBASE] Город "${cityName}" сохранен с ID: ${cityId}`);
        
      } catch (firebaseError) {
        console.error('❌ Ошибка сохранения в Firebase:', firebaseError.message);
      }
    }
    
    // ⚠️ FALLBACK: Сохраняем локально
    console.log('📁 Сохраняю город локально...');
    
    // Сохраняем обновленный список городов
    await fileManager.writeJSON('cities.json', cities);
    
    // Создаем файл города
    const cityFileName = fileManager.generateCityFileName(cityName);
    const cityData = {
      name: cityName,
      places: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (options.photoUrl) {
      cityData.photo = {
        url: options.photoUrl,
        fileName: options.photoFileName,
        telegramFileId: options.photoFileId
      };
    }
    
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
  if (!cityName || typeof cityName !== 'string') {
    console.warn('⚠️ [generateCityId] Некорректное имя города:', cityName);
    return 'unknown';
  }
  
  console.log(`🔑 [generateCityId] Входное значение: "${cityName}"`);
  
  const translitMap = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
    'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i',
    'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
    'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
    'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch',
    'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '',
    'э': 'e', 'ю': 'yu', 'я': 'ya'
  };
  
  let key = '';
  const cleaned = cityName.trim().toLowerCase();
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    
    if (translitMap[char] !== undefined) {
      key += translitMap[char];
    } else if (char.match(/[a-z0-9]/)) {
      key += char;
    } else if (char === ' ' || char === '-' || char === '_') {
      key += '_';
    } else if (char === '.') {
      key += '_';
    }
    // Пропускаем все остальные символы
  }
  
  // Убираем множественные подчеркивания
  key = key.replace(/_+/g, '_');
  
  // Убираем подчеркивания в начале и конце
  key = key.replace(/^_+|_+$/g, '');
  
  // Если ключ пустой, используем 'unknown'
  if (!key || key.length === 0) {
    console.warn(`⚠️ [generateCityId] Получился пустой ключ для "${cityName}", использую 'unknown'`);
    return 'unknown';
  }
  
  const result = key.substring(0, 50); // Увеличил лимит до 50
  console.log(`🔑 [generateCityId] Результат: "${cityName}" -> "${result}"`);
  
  return result;
}
}

module.exports = new CityManager();