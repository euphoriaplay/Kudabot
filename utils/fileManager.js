const fs = require('fs-extra');
const path = require('path');

class FileManager {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.tempDir = path.join(__dirname, '..', 'temp');
    this.ensureDirectories();
  }

  ensureDirectories() {
    try {
      fs.ensureDirSync(this.dataDir);
      fs.ensureDirSync(this.tempDir);
      console.log(`📁 Директории созданы: ${this.dataDir}`);
    } catch (error) {
      console.error('❌ Ошибка при создании директорий:', error);
    }
  }

  // Чтение JSON файла с улучшенной обработкой ошибок
async readJSON(fileName) {
  const filePath = path.join(this.dataDir, fileName);
  
  console.log(`📥 [DEBUG readJSON] Чтение файла: ${fileName} из ${filePath}`);
  
  try {
    if (!await fs.pathExists(filePath)) {
      console.log(`📭 [DEBUG readJSON] Файл ${fileName} не найден`);
      return [];
    }
    
    const stats = await fs.stat(filePath);
    console.log(`📊 [DEBUG readJSON] Размер файла ${fileName}: ${stats.size} байт`);
    
    const fileContent = await fs.readFile(filePath, 'utf8');
    
    if (!fileContent || fileContent.trim().length === 0) {
      console.warn(`⚠️ [DEBUG readJSON] Файл ${fileName} пустой`);
      return [];
    }
    
    const data = JSON.parse(fileContent);
    console.log(`✅ [DEBUG readJSON] Файл ${fileName} успешно загружен`);
    
    return data;
  } catch (error) {
    console.error(`❌ [DEBUG readJSON] Ошибка чтения ${fileName}:`, error.message);
    return [];
  }
}

  // Запись в JSON файл с проверкой
  async writeJSON(fileName, data, options = { spaces: 2 }) {
    const filePath = path.join(this.dataDir, fileName);
    
    try {
      // Проверяем данные перед записью
      if (data === undefined || data === null) {
        throw new Error('Данные для записи не определены');
      }
      
      // Преобразуем данные в строку для проверки
      const jsonString = JSON.stringify(data, null, options.spaces);
      
      // Проверяем, что JSON валиден
      JSON.parse(jsonString);
      
      // Записываем файл
      await fs.writeFile(filePath, jsonString, 'utf8');
      
      // Проверяем, что файл записан
      const stats = await fs.stat(filePath);
      console.log(`✅ Файл ${fileName} успешно сохранен (${stats.size} байт)`);
      
      return true;
    } catch (error) {
      console.error(`❌ Ошибка записи ${fileName}:`, error.message);
      
      // Пробуем записать как простой массив, если данные сложные
      if (error.message.includes('circular structure') || error.message.includes('Converting circular')) {
        try {
          console.log(`🔄 Пробуем записать ${fileName} как простой массив...`);
          const simpleData = Array.isArray(data) ? data : [data];
          await fs.writeJson(filePath, simpleData, options);
          console.log(`✅ Файл ${fileName} сохранен в упрощенном формате`);
          return true;
        } catch (simpleError) {
          console.error(`❌ Ошибка при упрощенной записи ${fileName}:`, simpleError.message);
          return false;
        }
      }
      
      return false;
    }
  }

  // Получение списка всех JSON файлов в папке data
  async listDataFiles() {
    try {
      const files = await fs.readdir(this.dataDir);
      return files.filter(file => file.endsWith('.json'));
    } catch (error) {
      console.error('Ошибка при получении списка файлов:', error);
      return [];
    }
  }

  // Проверка существования файла
  async fileExists(fileName) {
    const filePath = path.join(this.dataDir, fileName);
    return await fs.pathExists(filePath);
  }

  // Удаление файла
  async deleteFile(fileName) {
    const filePath = path.join(this.dataDir, fileName);
    try {
      await fs.remove(filePath);
      console.log(`🗑️ Файл ${fileName} удален`);
      return true;
    } catch (error) {
      console.error(`Ошибка удаления ${fileName}:`, error);
      return false;
    }
  }

  // Сохранение временного файла
  async saveTempFile(filename, data) {
    const filePath = path.join(this.tempDir, filename);
    try {
      await fs.writeFile(filePath, data);
      return filePath;
    } catch (error) {
      console.error('Ошибка сохранения временного файла:', error);
      return null;
    }
  }

  // Очистка временных файлов
  async clearTempFiles() {
    try {
      const files = await fs.readdir(this.tempDir);
      for (const file of files) {
        await fs.remove(path.join(this.tempDir, file));
      }
      console.log('🧹 Временные файлы очищены');
      return true;
    } catch (error) {
      console.error('Ошибка очистки временных файлов:', error);
      return false;
    }
  }

  // Генерация имени файла для города
  generateCityFileName(cityName) {
    if (!cityName || typeof cityName !== 'string') {
      return 'unknown_city.json';
    }
    
    // Транслитерация и нормализация имени файла
    return cityName
      .toLowerCase()
      .replace(/[^a-zа-яё0-9\s]/gi, '')
      .replace(/\s+/g, '_')
      .replace(/ё/g, 'yo')
      .replace(/й/g, 'y')
      .replace(/ц/g, 'ts')
      .replace(/у/g, 'u')
      .replace(/к/g, 'k')
      .replace(/е/g, 'e')
      .replace(/н/g, 'n')
      .replace(/г/g, 'g')
      .replace(/ш/g, 'sh')
      .replace(/щ/g, 'sch')
      .replace(/з/g, 'z')
      .replace(/х/g, 'h')
      .replace(/ъ/g, '')
      .replace(/ф/g, 'f')
      .replace(/ы/g, 'i')
      .replace(/в/g, 'v')
      .replace(/а/g, 'a')
      .replace(/п/g, 'p')
      .replace(/р/g, 'r')
      .replace(/о/g, 'o')
      .replace(/л/g, 'l')
      .replace(/д/g, 'd')
      .replace(/ж/g, 'zh')
      .replace(/э/g, 'e')
      .replace(/я/g, 'ya')
      .replace(/ч/g, 'ch')
      .replace(/с/g, 's')
      .replace(/м/g, 'm')
      .replace(/и/g, 'i')
      .replace(/т/g, 't')
      .replace(/ь/g, '')
      .replace(/б/g, 'b')
      .replace(/ю/g, 'yu') + '.json';
  }

  // Проверить и исправить все JSON файлы
  async validateAllJSONFiles() {
    const files = await this.listDataFiles();
    const results = [];
    
    for (const file of files) {
      try {
        const data = await this.readJSON(file);
        console.log(`✅ ${file}: OK (${Array.isArray(data) ? data.length + ' элементов' : 'объект'})`);
        results.push({ file, status: 'OK', size: Array.isArray(data) ? data.length : 'object' });
      } catch (error) {
        console.error(`❌ ${file}: ОШИБКА - ${error.message}`);
        results.push({ file, status: 'ERROR', error: error.message });
      }
    }
    
    return results;
  }
}

module.exports = new FileManager();