class CategoryManager {
  
    getCityManager() {
    try {
      return require('./cityManager');
    } catch (error) {
      console.error('❌ Не удалось загрузить cityManager:', error);
      return null;
    }
  }
  
  getPlaceManager() {
    try {
      return require('./placeManager');
    } catch (error) {
      console.error('❌ Не удалось загрузить placeManager:', error);
      return null;
    }
  }
  
  constructor() {
    this.firebaseDB = null;
    this.defaultCategories = [];
  }

  // Инициализировать Firebase
  setFirebaseDB(firebaseDB) {
    this.firebaseDB = firebaseDB;
    console.log('✅ Firebase Database подключена к CategoryManager');
  }

  // ============ МЕТОДЫ ЧТЕНИЯ ============

  // Получить все категории ТОЛЬКО из Firebase
 async getAllCategories() {
  try {
    // Проверяем Firebase
    if (!this.firebaseDB || !this.firebaseDB.initialized) {
      console.warn('⚠️ Firebase не инициализирован, возвращаем стандартные категории');
      return this.defaultCategories;
    }
    
    console.log('📡 Получаю категории из Firebase Realtime Database...');
    const firebaseCategories = await this.firebaseDB.getAllCategories();
    
    console.log('📊 Категории из Firebase:', firebaseCategories);
    
    // Фильтруем пустые или невалидные категории
    const validCategories = (firebaseCategories || []).filter(cat => 
      cat && cat.name && typeof cat.name === 'string'
    );
    
    if (validCategories.length > 0) {
      console.log(`✅ Загружено ${validCategories.length} категорий из Firebase`);
      return validCategories;
    }
    
    console.log('📭 Firebase пуст или категории невалидны, возвращаем стандартные категории');
    return this.defaultCategories;
    
  } catch (error) {
    console.error('❌ Ошибка при загрузке категорий из Firebase:', error.message);
    console.log('⚠️ Возвращаем стандартные категории');
    return this.defaultCategories;
  }
}

  // Получить категорию по ID
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

  // Получить только пользовательские категории
  async getCustomCategories() {
    try {
      const allCategories = await this.getAllCategories();
      return allCategories.filter(cat => cat.isCustom === true);
    } catch (error) {
      console.error('Ошибка при загрузке пользовательских категорий:', error);
      return [];
    }
  }

  // ============ МЕТОДЫ ЗАПИСИ (ТОЛЬКО В FIREBASE) ============

  // ✅ ДОБАВИТЬ КАТЕГОРИЮ
async addCategory(name, emoji = '📁') {
  try {
    // Проверка Firebase
    if (!this.firebaseDB || !this.firebaseDB.initialized) {
      console.log('❌ Firebase не инициализирован. firebaseDB:', this.firebaseDB);
      return { 
        success: false, 
        message: '❌ Firebase не инициализирован. Невозможно сохранить категорию.' 
      };
    }

    console.log('🔍 [DEBUG addCategory] Методы firebaseDB:', Object.keys(this.firebaseDB));
    console.log('🔍 [DEBUG addCategory] Есть ли addCategory?:', typeof this.firebaseDB.addCategory);

      // Валидация
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return { 
          success: false, 
          message: 'Название категории должно содержать минимум 2 символа' 
        };
      }
      
      const cleanName = name.trim();
      const cleanEmoji = emoji || '📁';
      
      // Проверка существования
      const categories = await this.getAllCategories();
      const existingCategory = categories.find(
        cat => cat.name.toLowerCase() === cleanName.toLowerCase()
      );
      
      if (existingCategory) {
        return { 
          success: false, 
          message: `Категория "${cleanName}" уже существует!` 
        };
      }
      
      // Генерация ID
      const customCategories = categories.filter(cat => cat.isCustom);
      const newId = customCategories.length > 0 
        ? Math.max(...customCategories.map(c => c.id)) + 1 
        : this.defaultCategories.length + 1;
      
      // Создание новой категории
      const newCategory = {
        id: newId,
        name: cleanName,
        emoji: cleanEmoji,
        icon: cleanEmoji,
        isCustom: true,
        createdAt: new Date().toISOString()
      };
      
      // ☁️ СОХРАНЯЕМ ТОЛЬКО В FIREBASE
    console.log('☁️ Сохраняю категорию в Firebase Realtime Database...');
    console.log('📦 Данные для сохранения:', newCategory);
    
    // Пытаемся использовать addCategory, если он есть
    if (typeof this.firebaseDB.addCategory === 'function') {
      console.log('✅ Использую метод addCategory');
      const result = await this.firebaseDB.addCategory(newCategory);
      
      if (result && result.success) {
        console.log(`✅ Категория "${cleanName}" добавлена в Firebase`);
        return { 
          success: true, 
          category: newCategory,
          message: `Категория "${cleanName}" успешно создана!`
        };
      }
    } 
    // Если addCategory нет, пробуем saveCategory
    else if (typeof this.firebaseDB.saveCategory === 'function') {
      console.log('⚠️ addCategory нет, использую saveCategory');
      const result = await this.firebaseDB.saveCategory(newCategory.id, newCategory);
      
      if (result && result.success) {
        console.log(`✅ Категория "${cleanName}" сохранена в Firebase`);
        return { 
          success: true, 
          category: newCategory,
          message: `Категория "${cleanName}" успешно создана!`
        };
      }
    } 
    else {
      console.error('❌ Нет подходящих методов для сохранения категории в Firebase');
      return {
        success: false,
        message: 'Ошибка: Firebase не поддерживает сохранение категорий'
      };
    }
    
    // Если дошли сюда, значит что-то пошло не так
    throw new Error('Неизвестная ошибка Firebase');
    
  } catch (error) {
    console.error('❌ Ошибка при добавлении категории:', error);
    return { 
      success: false, 
      message: `Ошибка: ${error.message}` 
    };
  }
}

  // ✅ ОБНОВИТЬ КАТЕГОРИЮ
  async updateCategory(categoryId, updateData) {
    try {
      // Проверка Firebase
      if (!this.firebaseDB || !this.firebaseDB.initialized) {
        return { 
          success: false, 
          message: '❌ Firebase не инициализирован' 
        };
      }

      const categories = await this.getAllCategories();
      const category = categories.find(cat => cat.id == categoryId);
      
      if (!category) {
        return { 
          success: false, 
          message: 'Категория не найдена' 
        };
      }

      if (!category.isCustom) {
        return { 
          success: false, 
          message: 'Стандартные категории редактировать нельзя' 
        };
      }
      
      // Проверка уникальности нового названия
      if (updateData.name) {
        const nameExists = categories.some(cat => 
          cat.id != categoryId && 
          cat.name.toLowerCase() === updateData.name.trim().toLowerCase()
        );
        
        if (nameExists) {
          return { 
            success: false, 
            message: 'Категория с таким названием уже существует' 
          };
        }
      }
      
      // Создаём обновлённую категорию
      const updatedCategory = {
        ...category,
        name: updateData.name ? updateData.name.trim() : category.name,
        emoji: updateData.emoji || category.emoji,
        icon: updateData.emoji || category.icon,
        updatedAt: new Date().toISOString()
      };
      
      // ☁️ ОБНОВЛЯЕМ В FIREBASE
      console.log('☁️ Обновляю категорию в Firebase...');
      const result = await this.firebaseDB.updateCategory(categoryId, updatedCategory);
      
      if (result && result.success) {
        console.log('✅ Категория обновлена в Firebase');
        
        // Обновляем места с этой категорией
        await this.updatePlacesWithCategory(categoryId, updatedCategory);
        
        return { 
          success: true, 
          category: updatedCategory,
          message: 'Категория успешно обновлена' 
        };
      } else {
        throw new Error(result?.message || 'Ошибка обновления в Firebase');
      }
      
    } catch (error) {
      console.error('❌ Ошибка при обновлении категории:', error);
      return { 
        success: false, 
        message: `Ошибка: ${error.message}` 
      };
    }
  }

  // ✅ УДАЛИТЬ КАТЕГОРИЮ
async deleteCategory(categoryId) {
  try {
    // Проверка Firebase
    if (!this.firebaseDB || !this.firebaseDB.initialized) {
      return { 
        success: false, 
        message: '❌ Firebase не инициализирован' 
      };
    }

    const categories = await this.getAllCategories();
    const category = categories.find(cat => cat.id == categoryId);
    
    if (!category) {
      return { 
        success: false, 
        message: 'Категория не найдена' 
      };
    }

    if (!category.isCustom) {
      return { 
        success: false, 
        message: 'Стандартные категории удалить нельзя' 
      };
    }
    
    // 🔧 ИСПОЛЬЗУЕМ ПРАВИЛЬНЫЕ МЕНЕДЖЕРЫ
    const cityManager = this.getCityManager();
    const placeManager = this.getPlaceManager();
    
    if (!cityManager || !placeManager) {
      return {
        success: false,
        message: '❌ Ошибка загрузки менеджеров данных'
      };
    }
    
    const cities = await cityManager.getAllCities();
    let placesCount = 0;
    
    // 🔍 ПРОВЕРЯЕМ МЕТОДЫ placeManager
    console.log('🔍 Проверка методов placeManager:');
    console.log('  - getPlacesByCity:', typeof placeManager.getPlacesByCity);
    console.log('  - updatePlace:', typeof placeManager.updatePlace);
    console.log('  - getPlacesByCategory:', typeof placeManager.getPlacesByCategory);
    
    // 🔄 АЛЬТЕРНАТИВНЫЙ СПОСОБ: Используем методы из placeManager
    for (const city of cities) {
      try {
        // Используем placeManager вместо cityManager
        const places = await placeManager.getPlacesByCity(city);
        const categoryPlaces = places.filter(p => p.category_id == categoryId);
        placesCount += categoryPlaces.length;
      } catch (error) {
        console.error(`❌ Ошибка при получении мест для города ${city}:`, error.message);
      }
    }
    
    // Переводим места в категорию "Другое"
    if (placesCount > 0) {
      const otherCategory = categories.find(cat => cat.name === 'Другое');
      const otherCat = otherCategory || this.defaultCategories.find(cat => cat.name === 'Другое');
      
      if (otherCat) {
        console.log(`🔄 Перевод ${placesCount} мест в категорию "Другое"...`);
        
        for (const city of cities) {
          try {
            const places = await placeManager.getPlacesByCity(city);
            
            for (const place of places) {
              if (place.category_id == categoryId) {
                // 🔧 Используем placeManager.updatePlace()
                console.log(`   Обновляю место "${place.name}" в городе ${city}`);
                
                await placeManager.updatePlace(city, place.id, {
                  category_id: otherCat.id,
                  category_name: otherCat.name,
                  category_emoji: otherCat.emoji
                });
              }
            }
          } catch (error) {
            console.error(`❌ Ошибка при обновлении мест в городе ${city}:`, error.message);
          }
        }
      }
    }
    
    // ☁️ УДАЛЯЕМ ИЗ FIREBASE
    console.log('☁️ Удаляю категорию из Firebase...');
    
    // 🔧 Используем правильный метод firebaseDB
    let result;
    if (typeof this.firebaseDB.deleteCategory === 'function') {
      result = await this.firebaseDB.deleteCategory(categoryId);
    } else {
      console.error('❌ Метод deleteCategory не найден в firebaseDB');
      return {
        success: false,
        message: 'Ошибка: метод удаления категории не поддерживается'
      };
    }
    
    if (result && result.success) {
      console.log('✅ Категория удалена из Firebase');
      
      let message = `Категория "${category.emoji} ${category.name}" успешно удалена.`;
      if (placesCount > 0) {
        message += ` ${placesCount} мест переведены в категорию "Другое".`;
      }
      
      return { 
        success: true, 
        message: message
      };
    } else {
      throw new Error(result?.message || 'Ошибка удаления из Firebase');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при удалении категории:', error);
    return { 
      success: false, 
      message: `Ошибка: ${error.message}` 
    };
  }
}

  // ============ ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ============

  // Обновить места с категорией
 async updatePlacesWithCategory(categoryId, updatedCategory) {
  try {
    const cityManager = this.getCityManager();
    const placeManager = this.getPlaceManager();
    
    if (!cityManager || !placeManager) {
      console.error('❌ Не удалось загрузить менеджеры данных');
      return 0;
    }
    
    const cities = await cityManager.getAllCities();
    let updatedCount = 0;
    
    for (const city of cities) {
      try {
        // Используем placeManager для получения мест
        const places = await placeManager.getPlacesByCity(city);
        
        for (const place of places) {
          if (place.category_id == categoryId) {
            // Используем placeManager для обновления
            await placeManager.updatePlace(city, place.id, {
              category_name: updatedCategory.name,
              category_emoji: updatedCategory.emoji
            });
            updatedCount++;
          }
        }
      } catch (error) {
        console.error(`❌ Ошибка при обновлении мест в городе ${city}:`, error);
      }
    }
    
    console.log(`✅ Обновлено ${updatedCount} мест с категорией ID: ${categoryId}`);
    return updatedCount;
    
  } catch (error) {
    console.error('Ошибка при обновлении мест:', error);
    return 0;
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

  // Получить категории с количеством мест
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

  // Проверить и починить категории в Firebase
  async checkAndRepairCategories() {
    try {
      if (!this.firebaseDB || !this.firebaseDB.initialized) {
        return { 
          success: false, 
          message: 'Firebase не инициализирован' 
        };
      }

      const categories = await this.getAllCategories();
      
      if (categories.length === 0) {
        console.log('📭 Категории в Firebase отсутствуют');
        return { 
          success: true, 
          message: 'Категории отсутствуют (используются стандартные)' 
        };
      }
      
      console.log(`✅ Найдено ${categories.length} категорий в Firebase`);
      return { 
        success: true, 
        message: `Категории в порядке (${categories.length} шт.)` 
      };
      
    } catch (error) {
      console.error('Ошибка при проверке категорий:', error);
      return { 
        success: false, 
        message: error.message 
      };
    }
  }
}

module.exports = new CategoryManager();