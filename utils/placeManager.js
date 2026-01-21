const cityManager = require('./cityManager');
const categoryManager = require('./categoryManager');
const photoManager = require('./photoManager');
const fileManager = require('./fileManager');
const { v4: uuidv4 } = require('uuid');

class PlaceManager {
  constructor() {
    // ID генерируем динамически
  }

  // Получить все места из всех городов
  async getAllPlaces() {
    try {
      const allCities = await cityManager.getAllCities();
      const allPlaces = [];
      
      for (const city of allCities) {
        const places = await this.getPlacesByCity(city.name);
        allPlaces.push(...places);
      }
      
      console.log(`✅ [PlaceManager] Получено ${allPlaces.length} мест из всех городов`);
      return allPlaces;
    } catch (error) {
      console.error('❌ Ошибка при получении всех мест:', error.message);
      return [];
    }
  }

  // Получить все места города
  async getPlacesByCity(cityName) {
    const cityData = await cityManager.getCityData(cityName);
    return cityData.places || [];
  }

  // Получить места по категории
  async getPlacesByCategory(cityName, categoryId) {
    const places = await this.getPlacesByCity(cityName);
    return places.filter(place => place.category_id == categoryId);
  }

  // Получить место по ID (с загрузкой фото)
async getPlaceById(city, placeId) {
  try {
    const cityData = await cityManager.getCityData(city);
    const place = cityData.places.find(p => p.id === placeId);
    
    if (!place) {
      console.log(`⚠️ Место с ID ${placeId} не найдено в городе ${city}`);
      return null;
    }
    
    console.log(`✅ Найдено место: ${place.name} в городе ${city}`);
    
    // Убедимся, что photos всегда является массивом
    if (!Array.isArray(place.photos)) {
      console.log(`⚠️ У места ${place.name} photos не является массивом, исправляю...`);
      place.photos = [];
    }
    
    console.log(`📸 У места ${place.photos.length} фото`);
    
    // Логируем структуру фото для отладки
    if (place.photos.length > 0) {
      console.log('🔍 Структура фото места:', JSON.stringify(place.photos, null, 2));
    }
    
    return place;
    
  } catch (error) {
    console.error(`❌ Ошибка при получении места: ${error.message}`);
    return null;
  }
}

  // Добавить место
async addPlace(cityName, placeData) {
  try {
    console.log('📝 Добавляю место:', placeData.name);
    console.log('📸 Получено фото:', placeData.photos ? placeData.photos.length : 0);
    
    // Загружаем данные города через cityManager
    const cityData = await cityManager.getCityData(cityName);
    
    if (!cityData) {
      return {
        success: false,
        message: 'Город не найден'
      };
    }
    
    // Создаем новое место
    const newPlace = {
      id: uuidv4(),
      name: placeData.name,
      address: placeData.address,
      working_hours: placeData.working_hours,
      average_price: placeData.average_price,
      description: placeData.description,
      category_id: placeData.category_id,
      category_name: placeData.category_name,
      category_emoji: placeData.category_emoji,
      website: placeData.website || null,
      phone: placeData.phone || null,
      contacts: placeData.contacts || null,
      map_url: placeData.map_url || null,
      latitude: placeData.latitude || null,  // ✅ ДОБАВЛЕНО
      longitude: placeData.longitude || null, // ✅ ДОБАВЛЕНО
      google_place_id: placeData.google_place_id || null, // ✅ ДОБАВЛЕНО
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      photos: [] // Массив для сохранения информации о фото
    };
    
    // ✅ ИСПРАВЛЕНО: Сохраняем фото С URL!
    if (placeData.photos && Array.isArray(placeData.photos) && placeData.photos.length > 0) {
      console.log('💾 Сохраняю информацию о фото...');
      
      newPlace.photos = placeData.photos.map(photo => {
        // Проверяем, что есть URL
        if (!photo.url) {
          console.warn('⚠️ Фото без URL:', photo);
        }
        
        return {
          url: photo.url,              // ✅ ГЛАВНОЕ - URL!
          fileName: photo.fileName,
          uploadedAt: photo.uploadedAt || new Date().toISOString(),
          telegramFileId: photo.telegramFileId || null
        };
      });
      
      console.log('✅ Информация о фото сохранена:', newPlace.photos);
    }
    
    // Добавляем место в массив
    if (!cityData.places) {
      cityData.places = [];
    }
    
    cityData.places.push(newPlace);
    
    // Сохраняем обновленные данные через cityManager
    console.log('💾 Сохраняю данные города...');
    const saved = await cityManager.saveCityData(cityName, cityData);
    
    if (!saved || !saved.success) {
      console.error('❌ Не удалось сохранить данные города');
      return {
        success: false,
        message: 'Не удалось сохранить данные'
      };
    }
    
    console.log('✅ Место успешно добавлено с ID:', newPlace.id);
    
    return {
      success: true,
      message: 'Место успешно добавлено',
      place: newPlace
    };
    
  } catch (error) {
    console.error('❌ Ошибка в addPlace:', error);
    return {
      success: false,
      message: error.message
    };
  }
}
  
  async getCityStats(cityName) {
    try {
      const cityData = await cityManager.getCityData(cityName);
      
      if (!cityData || !cityData.places) {
        return {
          totalPlaces: 0,
          categoriesCount: {}
        };
      }
      
      const stats = {
        totalPlaces: cityData.places.length,
        categoriesCount: {}
      };
      
      cityData.places.forEach(place => {
        const catId = place.category_id;
        if (!stats.categoriesCount[catId]) {
          stats.categoriesCount[catId] = {
            count: 0,
            name: place.category_name,
            emoji: place.category_emoji
          };
        }
        stats.categoriesCount[catId].count++;
      });
      
      return stats;
      
    } catch (error) {
      console.error('❌ Ошибка при получении статистики:', error);
      return {
        totalPlaces: 0,
        categoriesCount: {}
      };
    }
  }
  
  async searchPlaces(cityName, query) {
    try {
      const cityData = await cityManager.getCityData(cityName);
      
      if (!cityData || !cityData.places) {
        return [];
      }
      
      const searchQuery = query.toLowerCase();
      
      return cityData.places.filter(place => 
        place.name.toLowerCase().includes(searchQuery) ||
        (place.description && place.description.toLowerCase().includes(searchQuery)) ||
        (place.address && place.address.toLowerCase().includes(searchQuery))
      );
      
    } catch (error) {
      console.error('❌ Ошибка при поиске мест:', error);
      return [];
    }
  }

  // Обновить место
async updatePlace(cityName, placeId, updateData) {
  try {
    console.log(`📝 [DEBUG updatePlace] Начало обновления места ID: ${placeId} в городе: "${cityName}"`);
    console.log(`📝 [DEBUG updatePlace] Данные для обновления:`, JSON.stringify(updateData, null, 2));
    
    const cityData = await cityManager.getCityData(cityName);
    
    if (!cityData || !cityData.places) {
      console.error(`❌ [DEBUG updatePlace] Город "${cityName}" не найден или нет мест`);
      return { success: false, message: 'Город не найден' };
    }
    
    console.log(`📝 [DEBUG updatePlace] Всего мест в городе: ${cityData.places.length}`);
    
    const placeIndex = cityData.places.findIndex(p => p.id === placeId);
    
    if (placeIndex === -1) {
      console.error(`❌ [DEBUG updatePlace] Место с ID ${placeId} не найдено в городе "${cityName}"`);
      return { success: false, message: 'Место не найдено' };
    }
    
    console.log(`📝 [DEBUG updatePlace] Найденное место:`, cityData.places[placeIndex].name);
    
    // Сохраняем старые данные для логирования
    const oldPlace = { ...cityData.places[placeIndex] };
    
    // Обновляем поля места
    cityData.places[placeIndex] = {
      ...cityData.places[placeIndex],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    console.log(`📝 [DEBUG updatePlace] Старое значение:`, oldPlace);
    console.log(`📝 [DEBUG updatePlace] Новое значение:`, cityData.places[placeIndex]);
    
    // ВАЖНО: Сохраняем изменения в файл
    const saveResult = await cityManager.saveCityData(cityName, cityData);
    
    console.log(`📝 [DEBUG updatePlace] Результат сохранения:`, saveResult);
    
    if (!saveResult || !saveResult.success) {
      console.error(`❌ [DEBUG updatePlace] Ошибка при сохранении данных`);
      return { success: false, message: 'Ошибка при сохранении данных' };
    }
    
    console.log(`✅ [DEBUG updatePlace] Место успешно обновлено и сохранено`);
    
    return { 
      success: true, 
      place: cityData.places[placeIndex],
      message: 'Место успешно обновлено'
    };
  } catch (error) {
    console.error('❌ [DEBUG updatePlace] Ошибка updatePlace:', error);
    return { success: false, message: error.message };
  }
}
// Удалить место
async deletePlace(cityName, placeId) {
  try {
    console.log(`🗑️ [DEBUG deletePlace] Начало удаления места ID: ${placeId} из города: ${cityName}`);
    
    const cityData = await cityManager.getCityData(cityName);
    
    if (!cityData || !cityData.places) {
      console.error(`❌ [DEBUG deletePlace] Город "${cityName}" не найден`);
      return { success: false, message: 'Город не найден' };
    }
    
    const initialLength = cityData.places.length;
    console.log(`🗑️ [DEBUG deletePlace] Всего мест в городе до удаления: ${initialLength}`);
    
    // Находим место для получения информации
    const placeToDelete = cityData.places.find(p => p.id === placeId);
    
    if (!placeToDelete) {
      console.error(`❌ [DEBUG deletePlace] Место с ID ${placeId} не найдено`);
      return { success: false, message: 'Место не найдено' };
    }
    
    console.log(`🗑️ [DEBUG deletePlace] Найдено место для удаления: "${placeToDelete.name}"`);
    
    // Удаляем место из массива
    cityData.places = cityData.places.filter(p => p.id !== placeId);
    
    const newLength = cityData.places.length;
    console.log(`🗑️ [DEBUG deletePlace] Мест после удаления: ${newLength}`);
    
    if (newLength === initialLength) {
      console.error(`❌ [DEBUG deletePlace] Место не было удалено (длина массива не изменилась)`);
      return { success: false, message: 'Не удалось удалить место' };
    }
    
    // Удаляем фото места (если есть)
    if (placeToDelete.photos && placeToDelete.photos.length > 0) {
      console.log(`🗑️ [DEBUG deletePlace] Удаляю ${placeToDelete.photos.length} фото места из Firebase`);
      
      // Удаляем каждое фото из Firebase Storage
      for (const photo of placeToDelete.photos) {
        try {
          // Если это Firebase URL - удаляем из Firebase
          if (photo.url && photo.url.includes('storage.googleapis.com')) {
            const firebaseStorage = require('./firebaseStorage');
            const result = await firebaseStorage.deletePhotoFromUrl(photo.url);
            if (result.success) {
              console.log(`✅ Фото удалено из Firebase: ${photo.url}`);
            } else {
              console.log(`⚠️ Ошибка удаления фото из Firebase: ${result.error}`);
            }
          }
        } catch (error) {
          console.error(`❌ Ошибка удаления фото:`, error.message);
        }
      }
    }
    
    // Обновляем время изменения города
    cityData.updatedAt = new Date().toISOString();
    
    // Сохраняем изменения
    const saveResult = await cityManager.saveCityData(cityName, cityData);
    
    if (!saveResult || !saveResult.success) {
      console.error(`❌ [DEBUG deletePlace] Ошибка при сохранении данных`);
      return { success: false, message: 'Ошибка при сохранении данных' };
    }
    
    console.log(`✅ [DEBUG deletePlace] Место "${placeToDelete.name}" успешно удалено`);
    
    return { 
      success: true, 
      message: `Место "${placeToDelete.name}" удалено`,
      deletedPlace: placeToDelete
    };
    
  } catch (error) {
    console.error('❌ [DEBUG deletePlace] Ошибка:', error);
    return { 
      success: false, 
      message: error.message 
    };
  }
}

  // Получить статистику по городу
  async getCityStats(cityName) {
    const places = await this.getPlacesByCity(cityName);
    const categories = await categoryManager.getAllCategories();
    
    const stats = {
      totalPlaces: places.length,
      byCategory: {},
      lastAdded: places.slice(-5).reverse(),
      categoriesCount: {}
    };
    
    // Считаем по категориям
    categories.forEach(cat => {
      const count = places.filter(p => p.category_id == cat.id).length;
      stats.byCategory[cat.name] = count;
      stats.categoriesCount[cat.id] = {
        name: cat.name,
        count: count,
        emoji: cat.emoji
      };
    });
    
    return stats;
  }

  
}

module.exports = new PlaceManager();