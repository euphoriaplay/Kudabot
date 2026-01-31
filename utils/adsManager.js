const fs = require('fs').promises;
const path = require('path');
const firebaseDB = require('./firebaseDatabase');

class AdsManager {
  constructor() {
    this.adsFilePath = path.join(__dirname, '..', 'data', 'ads.json');
    this.userAdIndexPath = path.join(__dirname, '..', 'data', 'user_ad_index.json');
    this.firebaseDB = null;
    this.ensureDataDirectory();
  }

  // Инициализировать Firebase
  setFirebaseDB(firebaseDB) {
    this.firebaseDB = firebaseDB;
    console.log('✅ Firebase Database подключена к AdsManager');
  }

  async ensureDataDirectory() {
    const dataDir = path.join(__dirname, '..', 'data');
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
    
    try {
      await fs.access(this.adsFilePath);
    } catch {
      await this.saveAdsToLocal([]);
    }
    
    try {
      await fs.access(this.userAdIndexPath);
    } catch {
      await this.saveUserAdIndexes({});
    }
  }

  // 🔥 ПРИОРИТЕТ FIREBASE: Загрузка рекламы
  async loadAds() {
    try {
      // ✅ ПРИОРИТЕТ 1: Firebase
      if (this.firebaseDB && this.firebaseDB.initialized) {
        console.log('🔥 [ПРИОРИТЕТ] Получаю рекламу из Firebase...');
        const firebaseAds = await this.firebaseDB.getAllAds();
        
        if (firebaseAds && firebaseAds.length > 0) {
          console.log(`✅ [FIREBASE] Загружено ${firebaseAds.length} рекламы`);
          return firebaseAds;
        }
        
        console.log('📭 Firebase пуст, проверяю локальный файл...');
      } else {
        console.warn('⚠️ Firebase не инициализирован, используется локальный файл');
      }
      
      // ⚠️ FALLBACK: локальный JSON (только если Firebase недоступен или пуст)
      console.log('📁 Получаю рекламу из локального файла...');
      const data = await fs.readFile(this.adsFilePath, 'utf8');
      const localAds = JSON.parse(data);
      
      // 🔥 Синхронизируем локальные данные в Firebase (если он доступен)
      if (this.firebaseDB && this.firebaseDB.initialized && localAds.length > 0) {
        console.log('🔄 Синхронизирую локальную рекламу в Firebase...');
        await this.firebaseDB.syncAdsToFirebase(localAds);
      }
      
      return localAds;
    } catch (error) {
      console.error('❌ Ошибка загрузки рекламы:', error);
      return [];
    }
  }

  // Сохранение в локальный файл (используется как резервная копия)
  async saveAdsToLocal(ads) {
    try {
      await fs.writeFile(
        this.adsFilePath,
        JSON.stringify(ads, null, 2),
        'utf8'
      );
      return { success: true };
    } catch (error) {
      console.error('❌ Ошибка сохранения рекламы в локальный файл:', error);
      return { success: false, error: error.message };
    }
  }

  async loadUserAdIndexes() {
    try {
      const data = await fs.readFile(this.userAdIndexPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  async saveUserAdIndexes(indexes) {
    try {
      await fs.writeFile(
        this.userAdIndexPath,
        JSON.stringify(indexes, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Ошибка сохранения индексов:', error);
    }
  }

  async getAdForUser(userId) {
    const ads = await this.loadAds();
    
    if (ads.length === 0) {
      return null;
    }

    // Загружаем индексы пользователей
    const userIndexes = await this.loadUserAdIndexes();
    
    // Получаем текущий индекс для пользователя (по умолчанию 0)
    let currentIndex = userIndexes[userId] || 0;
    
    // Если индекс вышел за пределы массива, сбрасываем
    if (currentIndex >= ads.length) {
      currentIndex = 0;
    }
    
    // Получаем рекламу
    const ad = ads[currentIndex];
    
    // Обновляем индекс для следующего раза
    userIndexes[userId] = (currentIndex + 1) % ads.length;
    await this.saveUserAdIndexes(userIndexes);
    
    return ad;
  }

  // 🔥 ПРИОРИТЕТ FIREBASE: Добавление рекламы
  async addAd(adData) {
    try {
      const newAd = {
        id: this.generateId(),
        text: adData.text,
        url: adData.url,
        created_at: new Date().toISOString(),
        views: 0
      };
      
      // ✅ ПРИОРИТЕТ 1: Сохраняем в Firebase
      if (this.firebaseDB && this.firebaseDB.initialized) {
        console.log('🔥 [ПРИОРИТЕТ] Сохраняю рекламу в Firebase...');
        const firebaseResult = await this.firebaseDB.saveAd(newAd.id, newAd);
        
        if (firebaseResult && firebaseResult.success) {
          console.log('✅ [FIREBASE] Реклама сохранена');
          
          // Обновляем локальный файл как резервную копию
          const ads = await this.loadAds();
          ads.push(newAd);
          await this.saveAdsToLocal(ads);
          
          return { 
            success: true, 
            message: 'Реклама успешно добавлена!',
            ad: newAd
          };
        }
      }
      
      // ⚠️ FALLBACK: Сохраняем только локально
      console.warn('⚠️ Firebase недоступен, сохраняю только локально');
      const data = await fs.readFile(this.adsFilePath, 'utf8');
      const ads = JSON.parse(data);
      ads.push(newAd);
      await this.saveAdsToLocal(ads);
      
      return { 
        success: true, 
        message: 'Реклама сохранена локально (Firebase недоступен)',
        ad: newAd
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Ошибка: ${error.message}` 
      };
    }
  }

  // 🔥 ПРИОРИТЕТ FIREBASE: Обновление рекламы
  async updateAd(adId, updateData) {
    try {
      const ads = await this.loadAds();
      const adIndex = ads.findIndex(ad => ad.id === adId);
      
      if (adIndex === -1) {
        return { 
          success: false, 
          message: 'Реклама не найдена' 
        };
      }
      
      const updatedAd = {
        ...ads[adIndex],
        ...updateData,
        updated_at: new Date().toISOString()
      };
      
      // ✅ ПРИОРИТЕТ 1: Обновляем в Firebase
      if (this.firebaseDB && this.firebaseDB.initialized) {
        console.log('🔥 [ПРИОРИТЕТ] Обновляю рекламу в Firebase...');
        const firebaseResult = await this.firebaseDB.saveAd(adId, updatedAd);
        
        if (firebaseResult && firebaseResult.success) {
          console.log('✅ [FIREBASE] Реклама обновлена');
          
          // Обновляем локальный файл как резервную копию
          ads[adIndex] = updatedAd;
          await this.saveAdsToLocal(ads);
          
          return { 
            success: true, 
            message: 'Реклама успешно обновлена!',
            ad: updatedAd
          };
        }
      }
      
      // ⚠️ FALLBACK: Обновляем только локально
      console.warn('⚠️ Firebase недоступен, обновляю только локально');
      ads[adIndex] = updatedAd;
      await this.saveAdsToLocal(ads);
      
      return { 
        success: true, 
        message: 'Реклама обновлена локально (Firebase недоступен)',
        ad: updatedAd
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Ошибка: ${error.message}` 
      };
    }
  }

  // 🔥 ПРИОРИТЕТ FIREBASE: Удаление рекламы
  async deleteAd(adId) {
    try {
      // ✅ ПРИОРИТЕТ 1: Удаляем из Firebase
      if (this.firebaseDB && this.firebaseDB.initialized) {
        console.log('🔥 [ПРИОРИТЕТ] Удаляю рекламу из Firebase...');
        const firebaseResult = await this.firebaseDB.deleteAd(adId);
        
        if (firebaseResult && firebaseResult.success) {
          console.log('✅ [FIREBASE] Реклама удалена');
          
          // Удаляем из локального файла как резервной копии
          const ads = await this.loadAds();
          const filteredAds = ads.filter(ad => ad.id !== adId);
          await this.saveAdsToLocal(filteredAds);
          
          return { 
            success: true, 
            message: 'Реклама успешно удалена!' 
          };
        }
      }
      
      // ⚠️ FALLBACK: Удаляем только локально
      console.warn('⚠️ Firebase недоступен, удаляю только локально');
      const data = await fs.readFile(this.adsFilePath, 'utf8');
      const ads = JSON.parse(data);
      const filteredAds = ads.filter(ad => ad.id !== adId);
      
      if (filteredAds.length === ads.length) {
        return { 
          success: false, 
          message: 'Реклама не найдена' 
        };
      }
      
      await this.saveAdsToLocal(filteredAds);
      
      return { 
        success: true, 
        message: 'Реклама удалена локально (Firebase недоступен)' 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Ошибка: ${error.message}` 
      };
    }
  }

  async getAdById(adId) {
    const ads = await this.loadAds();
    return ads.find(ad => ad.id === adId);
  }

  async getAllAds() {
    return await this.loadAds();
  }

  // 🔥 ПРИОРИТЕТ FIREBASE: Увеличение просмотров
  async incrementViews(adId) {
    try {
      const ads = await this.loadAds();
      const ad = ads.find(a => a.id === adId);
      
      if (ad) {
        ad.views = (ad.views || 0) + 1;
        
        // ✅ ПРИОРИТЕТ 1: Обновляем в Firebase
        if (this.firebaseDB && this.firebaseDB.initialized) {
          await this.firebaseDB.saveAd(adId, ad);
        }
        
        // Обновляем локальный файл
        await this.saveAdsToLocal(ads);
      }
    } catch (error) {
      console.error('Ошибка при увеличении просмотров:', error);
    }
  }

  generateId() {
    return `ad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = new AdsManager();
