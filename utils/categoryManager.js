const firebaseDB = require('./firebaseDatabase');

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
    // 📌 ОБНОВЛЕННЫЕ КАТЕГОРИИ ИЗ СПИСКА
    this.defaultCategories = [
      { id: 1, name: 'Английская', emoji: '🇬🇧', icon: '🇬🇧' },
      { id: 2, name: 'Бабл чай', emoji: '🧋', icon: '🧋' },
      { id: 3, name: 'Бар', emoji: '🍸', icon: '🍸' },
      { id: 4, name: 'Бургеры', emoji: '🍔', icon: '🍔' },
      { id: 5, name: 'Вьетнамская', emoji: '🇻🇳', icon: '🇻🇳' },
      { id: 6, name: 'Гриль', emoji: '🔥', icon: '🔥' },
     
      { id: 8, name: 'Домашняя', emoji: '🏠', icon: '🏠' },
      { id: 9, name: 'За городом', emoji: '🌲', icon: '🌲' },
      { id: 10, name: 'Караоке', emoji: '🎤', icon: '🎤' },
      { id: 11, name: 'Кальян', emoji: '💨', icon: '💨' },
      { id: 12, name: 'Компы', emoji: '💻', icon: '💻' }, // Если имеются в виду компьютеры/киберкафе
      { id: 13, name: 'Мороженое', emoji: '🍦', icon: '🍦' },
      { id: 14, name: 'Морепродукты', emoji: '🦞', icon: '🦞' },
      { id: 15, name: 'Польская', emoji: '🇵🇱', icon: '🇵🇱' },
      { id: 16, name: 'Пельмени', emoji: '🥟', icon: '🥟' },
      { id: 17, name: 'Рамен', emoji: '🍜', icon: '🍜' },
      { id: 18, name: 'Стейки', emoji: '🥩', icon: '🥩' },
      { id: 19, name: 'Украинская', emoji: '🇺🇦', icon: '🇺🇦' },
      { id: 20, name: 'Американская', emoji: '🇺🇸', icon: '🇺🇸' },
      { id: 21, name: 'Бранчи', emoji: '🥞', icon: '🥞' },
      { id: 22, name: 'Блины', emoji: '🥞', icon: '🥞' },
      { id: 23, name: 'Вино', emoji: '🍷', icon: '🍷' },
      { id: 24, name: 'Восточная', emoji: '🕌', icon: '🕌' },
      { id: 25, name: 'Грузинская', emoji: '🇬🇪', icon: '🇬🇪' },
      { id: 26, name: 'Десерты', emoji: '🍰', icon: '🍰' },
      { id: 27, name: 'Завтраки', emoji: '🍳', icon: '🍳' },
      { id: 28, name: 'Итальянская', emoji: '🇮🇹', icon: '🇮🇹' },
      { id: 29, name: 'Кофе', emoji: '☕', icon: '☕' },
      { id: 30, name: 'Китайская', emoji: '🇨🇳', icon: '🇨🇳' },
      { id: 31, name: 'Кебаб', emoji: '🥙', icon: '🥙' }, // Предположительно кебаб
      { id: 32, name: 'Мишлен гид', emoji: '⭐', icon: '⭐' },
      { id: 33, name: 'Ночные', emoji: '🌃', icon: '🌃' },
      { id: 34, name: 'Пиво', emoji: '🍺', icon: '🍺' },
      { id: 35, name: 'Пицца', emoji: '🍕', icon: '🍕' },
      { id: 36, name: 'Суши', emoji: '🍣', icon: '🍣' },
      { id: 37, name: 'Узбекская', emoji: '🇺🇿', icon: '🇺🇿' },
      { id: 38, name: 'Фуд-корт', emoji: '🍴', icon: '🍴' }
    ];
  }

  // Инициализировать Firebase
  setFirebaseDB(firebaseDB) {
    this.firebaseDB = firebaseDB;
    console.log('✅ Firebase Database подключена к CategoryManager');
  }

  // ============ МЕТОДЫ ЧТЕНИЯ ============

  // 🔥 ПРИОРИТЕТ FIREBASE: Получить все категории
  async getAllCategories() {
    try {
      // ✅ ПРИОРИТЕТ 1: Firebase
      if (this.firebaseDB && this.firebaseDB.initialized) {
        console.log('🔥 [ПРИОРИТЕТ] Получаю категории из Firebase...');
        
        const firebaseCategories = await this.firebaseDB.getAllCategories();
        console.log('📊 Категории из Firebase:', firebaseCategories);
        
        if (firebaseCategories && firebaseCategories.length > 0) {
          console.log(`✅ [FIREBASE] Загружено ${firebaseCategories.length} категорий`);
          return firebaseCategories;
        }
        
        // Если Firebase пуст, добавляем стандартные категории
        console.log('📭 Firebase пуст, добавляю стандартные категории...');
        await this.initializeDefaultCategories();
        return this.defaultCategories;
      }
      
      // ⚠️ FALLBACK: Стандартные категории
      console.warn('⚠️ Firebase не инициализирован, используются стандартные категории');
      return this.defaultCategories;
      
    } catch (error) {
      console.error('❌ Ошибка при загрузке категорий:', error.message);
      return this.defaultCategories;
    }
  }
  
  // Инициализировать стандартные категории в Firebase
  async initializeDefaultCategories() {
    if (!this.firebaseDB || !this.firebaseDB.initialized) return;
    
    console.log('🔄 Инициализирую стандартные категории в Firebase...');
    
    for (const category of this.defaultCategories) {
      try {
        await this.firebaseDB.saveCategory(category.id.toString(), category);
      } catch (error) {
        console.error(`❌ Ошибка сохранения категории ${category.name}:`, error);
      }
    }
    
    console.log('✅ Стандартные категории инициализированы в Firebase');
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
      // 🔥 ПРОВЕРКА FIREBASE
      if (!this.firebaseDB || !this.firebaseDB.initialized) {
        console.error('❌ Firebase не инициализирован');
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
      
      // 🔥 СОХРАНЯЕМ В FIREBASE
      console.log('🔥 [ПРИОРИТЕТ] Сохраняю категорию в Firebase...');
      console.log('📦 Данные для сохранения:', newCategory);
      
      // Используем addCategory, если он есть
      if (typeof this.firebaseDB.addCategory === 'function') {
        console.log('✅ Использую метод addCategory');
        const result = await this.firebaseDB.addCategory(newCategory);
        
        if (result && result.success) {
          console.log(`✅ [FIREBASE] Категория "${cleanName}" добавлена`);
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
          console.log(`✅ [FIREBASE] Категория "${cleanName}" сохранена`);
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
      // 🔥 ПРОВЕРКА FIREBASE
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
      
      // 🔥 ОБНОВЛЯЕМ В FIREBASE
      console.log('🔥 [ПРИОРИТЕТ] Обновляю категорию в Firebase...');
      const result = await this.firebaseDB.updateCategory(categoryId, updatedCategory);
      
      if (result && result.success) {
        console.log('✅ [FIREBASE] Категория обновлена');
        
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
      // 🔥 ПРОВЕРКА FIREBASE
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
      
      // Подсчитываем места с этой категорией
      for (const city of cities) {
        try {
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
      
      // 🔥 УДАЛЯЕМ ИЗ FIREBASE
      console.log('🔥 [ПРИОРИТЕТ] Удаляю категорию из Firebase...');
      
      const result = await this.firebaseDB.deleteCategory(categoryId);
      
      if (result && result.success) {
        console.log('✅ [FIREBASE] Категория удалена');
        
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
          const places = await placeManager.getPlacesByCity(city);
          
          for (const place of places) {
            if (place.category_id == categoryId) {
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