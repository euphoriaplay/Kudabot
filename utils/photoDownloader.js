const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

class PhotoDownloader {
  constructor(botToken) {
    this.botToken = botToken;
    this.photosDir = path.join(__dirname, '..', 'uploads', 'photos');
    
    // Создаем папку для фото
    fs.ensureDirSync(this.photosDir);
  }

  /**
   * Скачивает фото с серверов Telegram
   * @param {string} fileId - ID файла в Telegram
   * @returns {Promise<Object>} Объект с путем к файлу и URL
   */
  async downloadPhoto(fileId) {
    try {
      console.log(`📥 Скачиваю фото: ${fileId}`);
      
      // 1. Получаем информацию о файле
      const fileInfoUrl = `https://api.telegram.org/bot${this.botToken}/getFile?file_id=${fileId}`;
      const fileInfoResponse = await axios.get(fileInfoUrl);
      
      if (!fileInfoResponse.data.ok) {
        throw new Error('Не удалось получить информацию о файле');
      }
      
      const filePath = fileInfoResponse.data.result.file_path;
      const fileSize = fileInfoResponse.data.result.file_size;
      
      console.log(`📄 Информация о файле: ${filePath} (${fileSize} байт)`);
      
      // 2. Скачиваем файл
      const fileUrl = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
      const response = await axios({
        method: 'GET',
        url: fileUrl,
        responseType: 'arraybuffer'
      });
      
      // 3. Генерируем уникальное имя файла
      const timestamp = Date.now();
      const ext = path.extname(filePath) || '.jpg';
      const fileName = `photo_${timestamp}_${fileId.substring(0, 8)}${ext}`;
      const localPath = path.join(this.photosDir, fileName);
      
      // 4. Сохраняем файл
      await fs.writeFile(localPath, response.data);
      
      console.log(`✅ Фото сохранено: ${fileName}`);
      
      return {
        success: true,
        fileName: fileName,
        filePath: localPath,
        relativePath: `uploads/photos/${fileName}`,
        fileId: fileId,
        size: fileSize
      };
      
    } catch (error) {
      console.error(`❌ Ошибка при скачивании фото ${fileId}:`, error.message);
      return {
        success: false,
        error: error.message,
        fileId: fileId
      };
    }
  }

  /**
   * Скачивает массив фото
   * @param {Array<string>} fileIds - Массив ID файлов
   * @returns {Promise<Array>} Массив результатов
   */
  async downloadPhotos(fileIds) {
    const results = [];
    
    for (const fileId of fileIds) {
      const result = await this.downloadPhoto(fileId);
      if (result.success) {
        results.push(result);
      }
      
      // Небольшая задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  /**
   * Получает Buffer фото для отправки
   * @param {string} filePath - Путь к файлу
   * @returns {Promise<Buffer|null>}
   */
  async getPhotoBuffer(filePath) {
    try {
      // Если путь относительный, делаем абсолютным
      const absolutePath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(__dirname, '..', filePath);
      
      if (await fs.pathExists(absolutePath)) {
        return await fs.readFile(absolutePath);
      }
      
      console.warn(`⚠️ Файл не найден: ${absolutePath}`);
      return null;
      
    } catch (error) {
      console.error(`❌ Ошибка чтения файла ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Удаляет фото
   * @param {string} filePath - Путь к файлу
   */
  async deletePhoto(filePath) {
    try {
      const absolutePath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(__dirname, '..', filePath);
      
      if (await fs.pathExists(absolutePath)) {
        await fs.unlink(absolutePath);
        console.log(`🗑️ Фото удалено: ${filePath}`);
        return true;
      }
      return false;
      
    } catch (error) {
      console.error(`❌ Ошибка удаления файла ${filePath}:`, error.message);
      return false;
    }
  }

  /**
   * Получает размер папки с фото
   * @returns {Promise<number>} Размер в байтах
   */
  async getStorageSize() {
    try {
      const files = await fs.readdir(this.photosDir);
      let totalSize = 0;
      
      for (const file of files) {
        const filePath = path.join(this.photosDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      }
      
      return totalSize;
      
    } catch (error) {
      console.error('❌ Ошибка получения размера хранилища:', error.message);
      return 0;
    }
  }
}

module.exports = PhotoDownloader;