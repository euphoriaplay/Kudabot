const fs = require('fs');
const path = require('path');
const firebaseDB = require('./firebaseDatabase');
const categoryManager = require('./categoryManager');
const cityManager = require('./cityManager');
const placeManager = require('./placeManager');
const adsManager = require('./adsManager');

class FileSyncManager {
  constructor() {
    this.watchers = new Map();
    this.debounceTimers = new Map();
    this.syncInProgress = false;
  }

  // Начать отслеживание всех файлов
  startWatching(dataDir) {
    console.log('👁️  Включаю отслеживание изменений файлов...');
    
    this.watchFile(path.join(dataDir, 'categories.json'), 'categories');
    this.watchFile(path.join(dataDir, 'cities.json'), 'cities');
    this.watchFile(path.join(dataDir, 'ads.json'), 'ads');
    
    console.log('✅ Отслеживание включено');
  }

  // Отслеживать конкретный файл
  watchFile(filePath, fileType) {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Файл ${fileType} не существует, отслеживание пропущено`);
      return;
    }

    // Удаляем старый вотчер если есть
    if (this.watchers.has(fileType)) {
      this.watchers.get(fileType).close();
    }

    const watcher = fs.watch(filePath, (eventType, filename) => {
      // Игнорируем событие rename в Windows
      if (eventType === 'rename') return;

      console.log(`📝 Обнаружено изменение: ${fileType}`);
      
      // Используем debounce чтобы избежать множественных синхронизаций
      this.debounceSync(fileType, filePath);
    });

    this.watchers.set(fileType, watcher);
  }

  // Debounce для синхронизации (ждём 1 сек после последнего изменения)
  debounceSync(fileType, filePath) {
    // Очищаем старый таймер если есть
    if (this.debounceTimers.has(fileType)) {
      clearTimeout(this.debounceTimers.get(fileType));
    }

    // Устанавливаем новый таймер
    const timer = setTimeout(() => {
      this.syncFileToFirebase(fileType, filePath);
      this.debounceTimers.delete(fileType);
    }, 1000);

    this.debounceTimers.set(fileType, timer);
  }

  // Синхронизировать файл в Firebase
  async syncFileToFirebase(fileType, filePath) {
    if (this.syncInProgress) {
      console.log(`⏳ Синхронизация уже в процессе, пропускаю ${fileType}`);
      return;
    }

    try {
      this.syncInProgress = true;
      
      switch (fileType) {
        case 'categories':
          await this.syncCategories(filePath);
          break;
        case 'cities':
          await this.syncCities(filePath);
          break;
        case 'ads':
          await this.syncAds(filePath);
          break;
        default:
          console.log(`⚠️  Неизвестный тип файла: ${fileType}`);
      }
    } catch (error) {
      console.error(`❌ Ошибка при синхронизации ${fileType}:`, error.message);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Синхронизировать категории
  async syncCategories(filePath) {
    try {
      console.log('🔄 Синхронизирую категории...');
      
      const categories = await categoryManager.getAllCategories();
      
      if (!categories || categories.length === 0) {
        console.log('⚠️  Нет категорий для синхронизации');
        return;
      }

      const result = await firebaseDB.syncCategoriesToFirebase(categories);
      
      if (result.success) {
        console.log(`✅ Категории синхронизированы: ${categories.length} шт.`);
      } else {
        console.error(`❌ Ошибка синхронизации категорий: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ Ошибка при синхронизации категорий:', error.message);
    }
  }

  // Синхронизировать города
  async syncCities(filePath) {
    try {
      console.log('🔄 Синхронизирую города...');
      
      const cities = await cityManager.getAllCities();
      
      if (!cities || cities.length === 0) {
        console.log('⚠️  Нет городов для синхронизации');
        return;
      }

      const result = await firebaseDB.syncCitiesToFirebase(cities);
      
      if (result.success) {
        console.log(`✅ Города синхронизированы: ${cities.length} шт.`);
      } else {
        console.error(`❌ Ошибка синхронизации городов: ${result.message}`);
      }
      
      // Также синхронизируем места если они изменились
      await this.syncPlaces();
    } catch (error) {
      console.error('❌ Ошибка при синхронизации городов:', error.message);
    }
  }

  // Синхронизировать места
  async syncPlaces() {
    try {
      console.log('🔄 Синхронизирую места...');
      
      const places = await placeManager.getAllPlaces();
      
      if (!places || places.length === 0) {
        console.log('⚠️  Нет мест для синхронизации');
        return;
      }

      const result = await firebaseDB.syncPlacesToFirebase(places);
      
      if (result.success) {
        console.log(`✅ Места синхронизированы: ${places.length} шт.`);
      } else {
        console.error(`❌ Ошибка синхронизации мест: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ Ошибка при синхронизации мест:', error.message);
    }
  }

  // Синхронизировать рекламу
  async syncAds(filePath) {
    try {
      console.log('🔄 Синхронизирую рекламу...');
      
      const ads = await adsManager.loadAds();
      
      if (!ads || ads.length === 0) {
        console.log('⚠️  Нет рекламы для синхронизации');
        return;
      }

      const result = await firebaseDB.syncAdsToFirebase(ads);
      
      if (result.success) {
        console.log(`✅ Реклама синхронизирована: ${ads.length} шт.`);
      } else {
        console.error(`❌ Ошибка синхронизации рекламы: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ Ошибка при синхронизации рекламы:', error.message);
    }
  }

  // Остановить отслеживание всех файлов
  stopWatching() {
    console.log('🛑 Отключаю отслеживание файлов...');
    
    for (const [fileType, watcher] of this.watchers.entries()) {
      watcher.close();
      console.log(`✅ Отслеживание ${fileType} остановлено`);
    }
    
    this.watchers.clear();
    
    // Очищаем все таймеры debounce
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }
}

module.exports = new FileSyncManager();
