const fs = require('fs-extra');
const path = require('path');

class PhotoViewer {
  constructor() {
    this.photosDir = path.join(__dirname, '..', 'uploads', 'photos');
  }

  // Получить список всех городов с фото
  async getAllCitiesWithPhotos() {
    try {
      if (!await fs.pathExists(this.photosDir)) {
        return [];
      }
      
      const cities = await fs.readdir(this.photosDir);
      const result = [];
      
      for (const city of cities) {
        const cityPath = path.join(this.photosDir, city);
        const stats = await fs.stat(cityPath);
        
        if (stats.isDirectory()) {
          const places = await fs.readdir(cityPath);
          result.push({
            city: city,
            places: places.length,
            path: cityPath
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ Ошибка при получении списка городов:', error);
      return [];
    }
  }

  // Получить информацию о фото места
  async getPlacePhotoInfo(cityName, placeId) {
    try {
      const placeDir = path.join(this.photosDir, cityName, placeId.toString());
      
      if (!await fs.pathExists(placeDir)) {
        return { exists: false };
      }
      
      const files = await fs.readdir(placeDir);
      const photos = [];
      
      for (const file of files) {
        if (file.match(/\.(jpg|jpeg|png)$/i)) {
          const filePath = path.join(placeDir, file);
          const stats = await fs.stat(filePath);
          
          photos.push({
            fileName: file,
            filePath: filePath,
            size: stats.size,
            created: stats.mtime,
            sizeMB: (stats.size / (1024 * 1024)).toFixed(2)
          });
        }
      }
      
      return {
        exists: true,
        city: cityName,
        placeId: placeId,
        photoCount: photos.length,
        photos: photos,
        totalSizeMB: photos.reduce((sum, photo) => sum + parseFloat(photo.sizeMB), 0).toFixed(2)
      };
    } catch (error) {
      console.error('❌ Ошибка при получении информации о фото:', error);
      return { exists: false, error: error.message };
    }
  }

  // Проверить целостность фото
  async checkPhotoIntegrity(cityName, placeId, fileName) {
    try {
      const filePath = path.join(this.photosDir, cityName, placeId.toString(), fileName);
      
      if (!await fs.pathExists(filePath)) {
        return { valid: false, error: 'Файл не существует' };
      }
      
      const stats = await fs.stat(filePath);
      
      // Простая проверка: файл должен быть больше 1KB
      if (stats.size < 1024) {
        return { valid: false, error: 'Файл слишком маленький' };
      }
      
      return {
        valid: true,
        filePath: filePath,
        size: stats.size,
        sizeKB: (stats.size / 1024).toFixed(2)
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Удалить поврежденные фото
  async removeCorruptedPhotos(cityName, placeId) {
    try {
      const placeDir = path.join(this.photosDir, cityName, placeId.toString());
      
      if (!await fs.pathExists(placeDir)) {
        return { deleted: 0, total: 0 };
      }
      
      const files = await fs.readdir(placeDir);
      let deleted = 0;
      
      for (const file of files) {
        const result = await this.checkPhotoIntegrity(cityName, placeId, file);
        
        if (!result.valid) {
          const filePath = path.join(placeDir, file);
          await fs.remove(filePath);
          deleted++;
          console.log(`🗑️ Удалено поврежденное фото: ${filePath}`);
        }
      }
      
      return {
        deleted: deleted,
        total: files.length,
        remaining: files.length - deleted
      };
    } catch (error) {
      console.error('❌ Ошибка при удалении поврежденных фото:', error);
      return { deleted: 0, total: 0, error: error.message };
    }
  }
}

module.exports = new PhotoViewer();