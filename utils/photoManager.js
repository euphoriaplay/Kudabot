const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class PhotoManager {
  constructor() {
    this.photosDir = path.join(__dirname, '../data/photos');
  }

  // Получить фото места (теперь только для Firebase URL или локальных файлов)
  async getPlacePhotos(city, placeId) {
    try {
      console.log(`🔍 Получение фото для места ${placeId} в городе ${city}`);
      
      // Пока просто возвращаем пустой массив - фото теперь хранятся в Firebase
      // и URL хранятся в самом объекте места
      return [];
    } catch (error) {
      console.error(`❌ Ошибка при получении фото места: ${error.message}`);
      return [];
    }
  }

  // Получить буфер фото из локального файла (для обратной совместимости)
  async getPhotoBuffer(filePath) {
    try {
      if (!filePath) return null;
      
      // Если это URL (из Firebase), возвращаем null
      if (filePath.startsWith('http')) {
        console.log(`ℹ️ Пропускаем URL фото: ${filePath}`);
        return null;
      }
      
      const fullPath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(this.photosDir, filePath);
      
      console.log(`📸 Чтение локального фото: ${fullPath}`);
      
      // Проверяем существование файла
      try {
        await fs.access(fullPath);
      } catch {
        console.warn(`⚠️ Файл не существует: ${fullPath}`);
        return null;
      }
      
      const buffer = await fs.readFile(fullPath);
      console.log(`✅ Фото прочитано: ${buffer.length} байт`);
      return buffer;
      
    } catch (error) {
      console.error(`❌ Ошибка чтения фото: ${error.message}`);
      return null;
    }
  }

  // Сохранить фото локально (ОТКЛЮЧЕНО - используется только Firebase Storage)
  async savePhoto(fileBuffer, city, placeId, fileName) {
    console.log(`⚠️ Локальное сохранение отключено - файлы хранятся только в Firebase Storage`);
    return null;
  }

  // Удалить фото локально (ОТКЛЮЧЕНО - файлы хранятся только в Firebase Storage)
  async deletePhoto(filePath) {
    console.log(`⚠️ Локальное удаление отключено - файлы хранятся только в Firebase Storage`);
    return true;
  }

  // Проверить существование фото
  async photoExists(filePath) {
    try {
      if (!filePath) return false;
      
      const fullPath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(this.photosDir, filePath);
      
      try {
        await fs.access(fullPath);
        return true;
      } catch {
        return false;
      }
      
    } catch (error) {
      console.error(`❌ Ошибка проверки фото: ${error.message}`);
      return false;
    }
  }

  // Получить все фото места из локальной папки (для миграции)
  async getLocalPlacePhotos(city, placeId) {
    try {
      const placeDir = path.join(this.photosDir, city, placeId);
      
      try {
        await fs.access(placeDir);
      } catch {
        return [];
      }
      
      const files = await fs.readdir(placeDir);
      const photos = [];
      
      for (const file of files) {
        if (file.match(/\.(jpg|jpeg|png|gif)$/i)) {
          photos.push({
            fileName: file,
            filePath: path.join(placeDir, file),
            relativePath: path.join(city, placeId, file)
          });
        }
      }
      
      console.log(`📸 Найдено ${photos.length} локальных фото для места ${placeId}`);
      return photos;
      
    } catch (error) {
      console.error(`❌ Ошибка получения локальных фото: ${error.message}`);
      return [];
    }
  }
}

module.exports = new PhotoManager();