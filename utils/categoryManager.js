const fileManager = require('./fileManager');

class CategoryManager {
  constructor() {
    this.categoriesFile = 'categories.json';
    this.firebaseDB = null;
    this.defaultCategories = [];
  }

  // Инициализировать Firebase
  setFirebaseDB(firebaseDB) {
    this.firebaseDB = firebaseDB;
  }

  // Получить все категории из Firebase с fallback на JSON
  async getAllCategories() {
    try {
      // Попытка 1: Firebase
      if (this.firebaseDB && this.firebaseDB.initialized) {
        try {
          console.log('📡 Получаю категории из Firebase...');
          const firebaseCategories = await this.firebaseDB.getAllCategories();
          if (firebaseCategories && firebaseCategories.length > 0) {
            console.log(`✅ Загружено ${firebaseCategories.length} категорий из Firebase`);
            return firebaseCategories;
          }
        } catch (fbError) {
          console.warn('⚠️ Firebase недоступен, используем локальный JSON');
        }
      }
      
      // Попытка 2: локальный JSON
      console.log('📁 Получаю категории из локального файла...');
      let customCategories = [];
      const rawData = await fileManager.readJSON(this.categoriesFile);
      
      // Проверяем, что данные являются массивом
      if (Array.isArray(rawData)) {
        customCategories = rawData;
      } else if (rawData && typeof rawData === 'object') {
        // Если это объект, попробуем преобразовать в массив
        customCategories = Object.values(rawData);
      }
      
      console.log(`📊 Загружено ${customCategories.length} пользовательских категорий`);
      
      // Если файл пустой или не содержит категорий, возвращаем дефолтные
      if (customCategories.length === 0) {
        console.log('📭 Файл категорий пуст, возвращаем стандартные категории');
        return this.defaultCategories;
      }
      
      // Объединяем дефолтные и пользовательские категории
      // Фильтруем, чтобы избежать дубликатов по имени
      const allCategories = [...this.defaultCategories];
      const existingNames = new Set(this.defaultCategories.map(c => c.name.toLowerCase()));
      
      // Добавляем пользовательские категории
      customCategories.forEach(cat => {
        // Проверяем, что категория имеет все необходимые поля
        if (cat && cat.name && !existingNames.has(cat.name.toLowerCase())) {
          // Генерируем ID если его нет
          const newId = cat.id || allCategories.length + 1;
          
          allCategories.push({
            id: newId,
            name: cat.name,
            emoji: cat.emoji || '📁',
            icon: cat.icon || cat.emoji || '📁',
            isCustom: true,
            createdAt: cat.createdAt || new Date().toISOString()
          });
          
          existingNames.add(cat.name.toLowerCase());
        }
      });
      
      console.log(`📋 Всего категорий: ${allCategories.length}`);
      return allCategories;
      
    } catch (error) {
      console.error('❌ Критическая ошибка при загрузке категорий:', error.message);
      console.log('⚠️ Возвращаем стандартные категории');
      return this.defaultCategories;
    }
  }

  // Получить категорию по ID с проверкой
  async getCategoryById(categoryId) {
    try {
      const categories = await this.getAllCategories();
      const category = categories.find(cat => cat.id == categoryId);
      
      if (!category) {
        console.warn(`⚠️ Категория с ID ${categoryId} не найдена`);
        return { 
          id: categoryId, 
          name: 'Неизвестная категория', 
          emoji: '📁', 
          icon: '📁' 
        };
      }
      
      return category;
    } catch (error) {
      console.error('Ошибка при получении категории по ID:', error);
      return { 
        id: categoryId, 
        name: 'Ошибка загрузки', 
        emoji: '❌', 
        icon: '❌' 
      };
    }
  }

  // Добавить новую категорию с улучшенной проверкой
  async addCategory(name, emoji = '📁') {
    try {
      // Проверяем входные данные
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return { 
          success: false, 
          message: 'Название категории должно содержать минимум 2 символа' 
        };
      }
      
      const cleanName = name.trim();
      const cleanEmoji = emoji || '📁';
      
      const categories = await this.getAllCategories();
      
      // Проверяем, существует ли уже категория с таким названием
      const existingCategory = categories.find(
        cat => cat.name.toLowerCase() === cleanName.toLowerCase()
      );
      
      if (existingCategory) {
        return { 
          success: false, 
          message: `Категория "${cleanName}" уже существует!` 
        };
      }
      
      // Получаем текущие пользовательские категории
      let customCategories = await this.getCustomCategories();
      
      // Генерируем ID
      const newId = customCategories.length > 0 
        ? Math.max(...customCategories.map(c => c.id)) + 1 
        : this.defaultCategories.length + 1;
      
      // Создаем новую категорию
      const newCategory = {
        id: newId,
        name: cleanName,
        emoji: cleanEmoji,
        icon: cleanEmoji,
        isCustom: true,
        createdAt: new Date().toISOString()
      };
      
      // Добавляем новую категорию
      customCategories.push(newCategory);
      
      // Сохраняем в файл
      const saved = await fileManager.writeJSON(this.categoriesFile, customCategories);
      
      if (saved) {
        console.log(`✅ Создана новая категория: "${cleanName}"`);
        return { 
          success: true, 
          category: newCategory,
          message: `Категория "${cleanName}" успешно создана!`
        };
      }
      
      return { 
        success: false, 
        message: 'Ошибка при сохранении категории' 
      };
      
    } catch (error) {
      console.error('Ошибка при добавлении категории:', error);
      return { 
        success: false, 
        message: `Внутренняя ошибка: ${error.message}` 
      };
    }
  }

  // Получить только пользовательские категории с исправлением
  async getCustomCategories() {
    try {
      const data = await fileManager.readJSON(this.categoriesFile);
      
      // Если data - не массив, возвращаем пустой массив
      if (!Array.isArray(data)) {
        console.warn('⚠️ categories.json не содержит массив, возвращаем пустой массив');
        return [];
      }
      
      // Фильтруем только валидные категории
      const validCategories = data.filter(cat => 
        cat && 
        typeof cat === 'object' && 
        cat.name && 
        typeof cat.name === 'string'
      );
      
      return validCategories;
    } catch (error) {
      console.error('Ошибка при загрузке пользовательских категорий:', error);
      return [];
    }
  }

  // Удалить категорию (только пользовательскую)
  async deleteCategory(categoryId) {
    try {
      const customCategories = await this.getCustomCategories();
      const index = customCategories.findIndex(cat => cat.id == categoryId);
      
      if (index === -1) {
        return { 
          success: false, 
          message: 'Категория не найдена или является стандартной' 
        };
      }
      
      const removedCategory = customCategories[index];
      
      // Проверяем, используется ли категория в местах
      const cityManager = require('./cityManager');
      const cities = await cityManager.getAllCities();
      let placesCount = 0;
      
      for (const city of cities) {
        const cityData = await cityManager.getCityData(city);
        if (cityData && cityData.places) {
          const places = cityData.places.filter(p => p.category_id == categoryId);
          placesCount += places.length;
        }
      }
      
      // Если есть места в этой категории, переводим их в категорию "Другое"
      if (placesCount > 0) {
        const otherCategory = this.defaultCategories.find(cat => cat.name === 'Другое');
        const defaultCategories = this.defaultCategories;
        const allCategories = [...defaultCategories, ...customCategories];
        const otherCat = otherCategory || allCategories.find(cat => cat.name === 'Другое');
        
        if (otherCat) {
          for (const city of cities) {
            const cityData = await cityManager.getCityData(city);
            if (cityData && cityData.places) {
              for (const place of cityData.places) {
                if (place.category_id == categoryId) {
                  place.category_id = otherCat.id;
                  place.category_name = otherCat.name;
                  place.category_emoji = otherCat.emoji;
                }
              }
              await cityManager.saveCityData(city, cityData);
            }
          }
        }
      }
      
      // Удаляем категорию
      customCategories.splice(index, 1);
      
      // Сохраняем изменения
      await fileManager.writeJSON(this.categoriesFile, customCategories);
      
      let message = `Категория "${removedCategory.emoji} ${removedCategory.name}" успешно удалена.`;
      if (placesCount > 0) {
        message += ` ${placesCount} мест переведены в категорию "Другое".`;
      }
      
      return { 
        success: true, 
        message: message
      };
      
    } catch (error) {
      console.error('Ошибка при удалении категории:', error);
      return { 
        success: false, 
        message: `Внутренняя ошибка: ${error.message}` 
      };
    }
  }

  // Поиск категорий
  async searchCategories(query) {
    try {
      const categories = await this.getAllCategories();
      const lowercaseQuery = query.toLowerCase();
      
      return categories.filter(cat => 
        cat.name.toLowerCase().includes(lowercaseQuery) ||
        (cat.emoji && cat.emoji.toLowerCase().includes(lowercaseQuery))
      );
    } catch (error) {
      console.error('Ошибка при поиске категорий:', error);
      return [];
    }
  }

  // Получить категории с количеством мест в городе
  async getCategoriesWithCounts(cityName, placeManager) {
    try {
      const categories = await this.getAllCategories();
      const result = [];
      
      for (const category of categories) {
        try {
          const places = await placeManager.getPlacesByCategory(cityName, category.id);
          result.push({
            ...category,
            count: places.length
          });
        } catch (error) {
          console.error(`Ошибка при получении мест для категории ${category.name}:`, error);
          result.push({
            ...category,
            count: 0
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('Ошибка при получении категорий со счетчиками:', error);
      return [];
    }
  }

  // Восстановить файл категорий
  async restoreCategoriesFile() {
    try {
      const initialCategories = [
        {
          id: 16,
          name: "Пиццерии",
          emoji: "🍕",
          icon: "🍕",
          isCustom: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 17,
          name: "Суши-бары",
          emoji: "🍣",
          icon: "🍣",
          isCustom: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 18,
          name: "Кофейни",
          emoji: "☕",
          icon: "☕",
          isCustom: true,
          createdAt: new Date().toISOString()
        }
      ];
      
      const saved = await fileManager.writeJSON(this.categoriesFile, initialCategories);
      
      if (saved) {
        console.log('✅ Файл categories.json восстановлен');
        return { success: true, message: 'Файл категорий восстановлен' };
      }
      
      return { success: false, message: 'Не удалось восстановить файл категорий' };
    } catch (error) {
      console.error('Ошибка при восстановлении файла категорий:', error);
      return { success: false, message: error.message };
    }
  }

  // Проверить и починить файл категорий
  async checkAndRepairCategories() {
    try {
      const data = await fileManager.readJSON(this.categoriesFile);
      
      // Если данные не массив, восстанавливаем файл
      if (!Array.isArray(data)) {
        console.warn('⚠️ Файл категорий поврежден, восстанавливаем...');
        return await this.restoreCategoriesFile();
      }
      
      // Проверяем каждую категорию
      const validCategories = data.filter(cat => 
        cat && 
        typeof cat === 'object' && 
        cat.name && 
        typeof cat.name === 'string' &&
        cat.id && 
        typeof cat.id === 'number'
      );
      
      // Если есть невалидные категории, перезаписываем файл
      if (validCategories.length !== data.length) {
        console.warn(`⚠️ Найдены невалидные категории: ${data.length - validCategories.length} шт.`);
        const saved = await fileManager.writeJSON(this.categoriesFile, validCategories);
        
        if (saved) {
          return { 
            success: true, 
            message: `Файл категорий исправлен (удалено ${data.length - validCategories.length} невалидных записей)` 
          };
        }
      }
      
      return { success: true, message: 'Файл категорий в порядке' };
    } catch (error) {
      console.error('Ошибка при проверке файла категорий:', error);
      return await this.restoreCategoriesFile();
    }
  }
  async updateCategory(categoryId, updateData) {
  try {
    const customCategories = await this.getCustomCategories();
    const index = customCategories.findIndex(cat => cat.id == categoryId);
    
    if (index === -1) {
      return { 
        success: false, 
        message: 'Категория не найдена или является стандартной' 
      };
    }
    
    // Проверяем уникальность нового названия
    if (updateData.name) {
      const nameExists = customCategories.some(cat => 
        cat.id != categoryId && cat.name.toLowerCase() === updateData.name.toLowerCase()
      );
      
      if (nameExists) {
        return { 
          success: false, 
          message: 'Категория с таким названием уже существует' 
        };
      }
    }
    
    // Обновляем данные
    if (updateData.name) {
      customCategories[index].name = updateData.name.trim();
    }
    
    if (updateData.emoji) {
      customCategories[index].emoji = updateData.emoji;
      customCategories[index].icon = updateData.emoji;
    }
    
    // Сохраняем изменения
    await fileManager.writeJSON(this.categoriesFile, customCategories);
    
    // Обновляем все места, которые используют эту категорию
    await this.updatePlacesWithCategory(categoryId, customCategories[index]);
    
    return { 
      success: true, 
      category: customCategories[index],
      message: 'Категория успешно обновлена' 
    };
    
  } catch (error) {
    console.error('Ошибка при обновлении категории:', error);
    return { 
      success: false, 
      message: `Внутренняя ошибка: ${error.message}` 
    };
  }
}

// Добавьте этот вспомогательный метод для обновления мест
async updatePlacesWithCategory(categoryId, updatedCategory) {
  try {
    const cityManager = require('./cityManager');
    const cities = await cityManager.getAllCities();
    let updatedCount = 0;
    
    for (const city of cities) {
      const cityData = await cityManager.getCityData(city);
      if (cityData && cityData.places) {
        let needsUpdate = false;
        
        for (const place of cityData.places) {
          if (place.category_id == categoryId) {
            place.category_name = updatedCategory.name;
            place.category_emoji = updatedCategory.emoji;
            needsUpdate = true;
            updatedCount++;
          }
        }
        
        if (needsUpdate) {
          await cityManager.saveCityData(city, cityData);
        }
      }
    }
    
    console.log(`✅ Обновлено ${updatedCount} мест с категорией ID: ${categoryId}`);
    return updatedCount;
    
  } catch (error) {
    console.error('Ошибка при обновлении мест:', error);
    return 0;
  }
}
}

module.exports = new CategoryManager();