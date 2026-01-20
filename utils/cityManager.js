const fs = require('fs-extra');
const path = require('path');
const fileManager = require('./fileManager');

class CityManager {
  constructor() {
    this.citiesFile = 'cities.json';
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

  // Получить путь к файлу города
getCityFilePath(cityName) {
  const fileName = fileManager.generateCityFileName(cityName);
  
  // Проверяем оба варианта: в папке cities и в корне data
  const citiesDirPath = path.join(this.citiesDir, fileName);
  const dataDirPath = path.join(this.dataDir, fileName);
  
  // Проверяем, где находится файл (БЕЗ ЛОГОВ)
  if (fs.existsSync(citiesDirPath)) {
    return citiesDirPath;
  } else if (fs.existsSync(dataDirPath)) {
    return dataDirPath;
  }
  
  // По умолчанию используем папку cities для новых файлов
  return citiesDirPath;
}

// Получить данные города
async getCityData(cityName) {
  try {
    const cityFilePath = this.getCityFilePath(cityName);
    
    if (await fs.pathExists(cityFilePath)) {
      const data = await fs.readJson(cityFilePath);
      return data;
    }
    
    // Если файла нет, создаем базовую структуру
    return {
      name: cityName,
      places: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Ошибка при чтении данных города:', error);
    return null;
  }
}

// Сохранить данные города - ИСПРАВЛЕНО!
async saveCityData(cityName, cityData) {
  try {
    const cityFilePath = this.getCityFilePath(cityName);
    
    // Обновляем время изменения
    cityData.updatedAt = new Date().toISOString();
    
    console.log(`💾 Сохраняю данные города "${cityName}" (${cityData.places?.length || 0} мест)`);
    
    // ✅ ПРОСТО СОХРАНЯЕМ - БЕЗ ЛИШНИХ ПРОВЕРОК
    await fs.writeJson(cityFilePath, cityData, { spaces: 2 });
    
    console.log(`✅ Данные успешно сохранены в ${path.basename(cityFilePath)}`);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Ошибка при сохранении данных города:', error);
    return { success: false, message: error.message };
  }
}

  // Получить данные города
  async getCityData(cityName) {
    try {
      const cityFilePath = this.getCityFilePath(cityName);
      
      console.log(`📂 [DEBUG getCityData] Читаю файл: ${cityFilePath}`);
      
      if (await fs.pathExists(cityFilePath)) {
        const data = await fs.readJson(cityFilePath);
        console.log(`✅ [DEBUG getCityData] Файл успешно прочитан, мест: ${data.places ? data.places.length : 0}`);
        return data;
      }
      
      // Если файла нет, создаем базовую структуру
      console.log(`🆕 [DEBUG getCityData] Создаю новую структуру для города ${cityName}`);
      return {
        name: cityName,
        places: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Ошибка при чтении данных города:', error);
      return null;
    }
  }

  // Сохранить данные города
  async saveCityData(cityName, cityData) {
    try {
      const cityFilePath = this.getCityFilePath(cityName);
      
      // Обновляем время изменения
      cityData.updatedAt = new Date().toISOString();
      
      console.log(`💾 [DEBUG saveCityData] Сохраняю данные в файл: ${cityFilePath}`);
      console.log(`💾 [DEBUG saveCityData] Количество мест: ${cityData.places ? cityData.places.length : 0}`);
      
      await fs.writeJson(cityFilePath, cityData, { spaces: 2 });
      
      // ПРОВЕРКА: читаем файл обратно, чтобы убедиться в сохранении
      const verification = await fs.readJson(cityFilePath);
      const savedPlace = verification.places.find(p => p.id === cityData.places[0]?.id);
      
      console.log(`✅ [DEBUG saveCityData] Данные сохранены в ${cityFilePath}`);
      console.log(`✅ [DEBUG saveCityData] Проверка: первое место в файле - ${savedPlace?.name || 'не найдено'}`);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Ошибка при сохранении данных города:', error);
      return { success: false, message: error.message };
    }
  }

  // Получить все города
  async getAllCities() {
    const cities = await fileManager.readJSON(this.citiesFile);
    return cities || [];
  }

  // Добавить город
  async addCity(cityName, photoData = {}) {
    const cities = await this.getAllCities();
    
    // Проверяем, существует ли уже такой город
    if (cities.includes(cityName)) {
      return { success: false, message: 'Город уже существует' };
    }
    
    // Создаем файл для нового города в папке cities
    const fileName = fileManager.generateCityFileName(cityName);
    const cityFilePath = path.join(this.citiesDir, fileName);
    
    const initialData = {
      name: cityName,
      places: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 📸 Добавляем информацию о фото если она есть
    if (photoData.photoUrl) {
      initialData.photo = {
        url: photoData.photoUrl,
        fileName: photoData.photoFileName,
        uploadedAt: new Date().toISOString(),
        telegramFileId: photoData.photoFileId || null
      };
      console.log(`📸 Сохраняю фото города: ${photoData.photoUrl}`);
    } else if (photoData.photoFileId) {
      initialData.photo = {
        telegramFileId: photoData.photoFileId,
        uploadedAt: new Date().toISOString()
      };
      console.log(`📸 Сохраняю file_id фото города: ${photoData.photoFileId}`);
    }
    
    try {
      await fs.writeJson(cityFilePath, initialData, { spaces: 2 });
      
      // Добавляем город в общий список
      cities.push(cityName);
      await fileManager.writeJSON(this.citiesFile, cities);
      
      return { 
        success: true, 
        message: 'Город добавлен', 
        fileName: fileName,
        cityName: cityName 
      };
    } catch (error) {
      console.error('❌ Ошибка при создании города:', error);
      return { success: false, message: 'Ошибка при создании файла города' };
    }
  }

  // Удалить город
  async removeCity(cityName) {
    const cities = await this.getAllCities();
    const index = cities.indexOf(cityName);
    
    if (index === -1) {
      return { success: false, message: 'Город не найден' };
    }
    
    // Удаляем файл города (проверяем оба варианта)
    const cityFilePath = this.getCityFilePath(cityName);
    
    try {
      await fs.remove(cityFilePath);
      
      // Удаляем город из списка
      cities.splice(index, 1);
      await fileManager.writeJSON(this.citiesFile, cities);
      
      console.log(`🗑️ Город ${cityName} удален`);
      return { success: true, message: 'Город удален' };
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
}

module.exports = new CityManager();