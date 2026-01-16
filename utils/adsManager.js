const fs = require('fs').promises;
const path = require('path');

class AdsManager {
  constructor() {
    this.adsFilePath = path.join(__dirname, '..', 'data', 'ads.json');
    this.userAdIndexPath = path.join(__dirname, '..', 'data', 'user_ad_index.json');
    this.ensureDataDirectory();
  }

  async ensureDataDirectory() {
    const dataDir = path.join(__dirname, '..', 'data');
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
    
    // Создаем файлы если их нет
    try {
      await fs.access(this.adsFilePath);
    } catch {
      await this.saveAds([]);
    }
    
    try {
      await fs.access(this.userAdIndexPath);
    } catch {
      await this.saveUserAdIndexes({});
    }
  }

  async loadAds() {
    try {
      const data = await fs.readFile(this.adsFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Ошибка загрузки рекламы:', error);
      return [];
    }
  }

  async saveAds(ads) {
    try {
      await fs.writeFile(
        this.adsFilePath,
        JSON.stringify(ads, null, 2),
        'utf8'
      );
      return { success: true };
    } catch (error) {
      console.error('Ошибка сохранения рекламы:', error);
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

  async addAd(adData) {
    try {
      const ads = await this.loadAds();
      
      const newAd = {
        id: this.generateId(),
        text: adData.text,
        url: adData.url,
        created_at: new Date().toISOString(),
        views: 0
      };
      
      ads.push(newAd);
      await this.saveAds(ads);
      
      return { 
        success: true, 
        message: 'Реклама успешно добавлена!',
        ad: newAd
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Ошибка: ${error.message}` 
      };
    }
  }

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
      
      ads[adIndex] = {
        ...ads[adIndex],
        ...updateData,
        updated_at: new Date().toISOString()
      };
      
      await this.saveAds(ads);
      
      return { 
        success: true, 
        message: 'Реклама успешно обновлена!',
        ad: ads[adIndex]
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Ошибка: ${error.message}` 
      };
    }
  }

  async deleteAd(adId) {
    try {
      const ads = await this.loadAds();
      const filteredAds = ads.filter(ad => ad.id !== adId);
      
      if (filteredAds.length === ads.length) {
        return { 
          success: false, 
          message: 'Реклама не найдена' 
        };
      }
      
      await this.saveAds(filteredAds);
      
      return { 
        success: true, 
        message: 'Реклама успешно удалена!' 
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

  async incrementViews(adId) {
    const ads = await this.loadAds();
    const ad = ads.find(a => a.id === adId);
    
    if (ad) {
      ad.views = (ad.views || 0) + 1;
      await this.saveAds(ads);
    }
  }

  generateId() {
    return `ad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = new AdsManager();