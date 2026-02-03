const cityManager = require('./cityManager');
const categoryManager = require('./categoryManager');
const photoManager = require('./photoManager');
const fileManager = require('./fileManager');
const firebaseDB = require('./firebaseDatabase');
const { v4: uuidv4 } = require('uuid');

class PlaceManager {
  constructor() {
    this.firebaseDB = null;
  }

  setFirebaseDB(firebaseDB) {
    this.firebaseDB = firebaseDB;
    console.log('✅ Firebase Database подключена к PlaceManager');
  }

  // 🔥 ПРИОРИТЕТ FIREBASE: Получить все места из всех городов
  async getAllPlaces() {
    try {
      // ✅ ПРИОРИТЕТ 1: Firebase
      if (this.firebaseDB && this.firebaseDB.initialized) {
        console.log('🔥 [ПРИОРИТЕТ] Получаю все места из Firebase...');
        
        try {
          const firebasePlaces = await this.firebaseDB.getAllPlaces();
          
          if (firebasePlaces && firebasePlaces.length > 0) {
            console.log(`✅ [FIREBASE] Получено ${firebasePlaces.length} мест`);
            return firebasePlaces;
          }
          
          console.log('📭 Firebase пуст, проверяю локальные файлы...');
        } catch (firebaseError) {
          console.error('❌ Ошибка Firebase в getAllPlaces:', firebaseError.message);
        }
      } else {
        console.warn('⚠️ Firebase не инициализирован, используются локальные файлы');
      }
      
      // ⚠️ FALLBACK: Локальные файлы
      console.log('📁 Получаю места из локальных файлов городов');
      const allCities = await cityManager.getAllCities();
      const allPlaces = [];
      
      for (const city of allCities) {
        const places = await this.getPlacesByCityLocal(city);
        allPlaces.push(...places);
      }
      
      console.log(`✅ Получено ${allPlaces.length} мест из локальных файлов`);
      
      return allPlaces;
    } catch (error) {
      console.error('❌ Ошибка при получении всех мест:', error.message);
      return [];
    }
  }

  // 🔥 ПРИОРИТЕТ FIREBASE: Получить все места города
  async getPlacesByCity(cityName) {
    try {
      // ✅ ПРИОРИТЕТ 1: Firebase
      if (this.firebaseDB && this.firebaseDB.initialized) {
        console.log(`🔥 [ПРИОРИТЕТ] Получаю места города "${cityName}" из Firebase...`);
        
        try {
          const firebasePlaces = await this.getPlacesByCityFirebase(cityName);
          
          if (firebasePlaces && firebasePlaces.length > 0) {
            console.log(`✅ [FIREBASE] Получено ${firebasePlaces.length} мест для города "${cityName}"`);
            return firebasePlaces;
          }
          
          console.log(`📭 Места города "${cityName}" не найдены в Firebase, проверяю локальный файл...`);
        } catch (firebaseError) {
          console.error(`❌ Ошибка Firebase для города "${cityName}":`, firebaseError.message);
        }
      }
      
      // ⚠️ FALLBACK: Локальные файлы
      return await this.getPlacesByCityLocal(cityName);
      
    } catch (error) {
      console.error(`❌ Общая ошибка при получении мест города "${cityName}":`, error);
      return [];
    }
  }

  // Получить места из Firebase
  async getPlacesByCityFirebase(cityName) {
    try {
      if (!this.firebaseDB || !this.firebaseDB.initialized) {
        return [];
      }
      
      const cityId = this.generateCityId(cityName);
      const cityRef = this.firebaseDB.db.ref(`cities/${cityId}`);
      const snapshot = await cityRef.once('value');
      const cityData = snapshot.val();
      
      if (!cityData || !cityData.places) {
        return [];
      }
      
      // Преобразуем объект в массив, если нужно
      if (typeof cityData.places === 'object' && !Array.isArray(cityData.places)) {
        return Object.values(cityData.places);
      }
      
      return cityData.places || [];
    } catch (error) {
      console.error(`❌ Ошибка получения мест из Firebase для ${cityName}:`, error);
      return [];
    }
  }

  // Получить места из локального файла
async getPlacesByCityLocal(cityName) {
  try {
    console.log(`📁 [getPlacesByCityLocal] Получаю данные города "${cityName}"`);
    
    const cityData = await cityManager.getCityData(cityName);
    
    console.log(`📊 [DEBUG] Данные города "${cityName}":`, {
      exists: !!cityData,
      hasPlaces: cityData && !!cityData.places,
      placesType: cityData && cityData.places ? typeof cityData.places : 'undefined',
      placesIsArray: cityData && cityData.places ? Array.isArray(cityData.places) : false,
      placesLength: cityData && cityData.places ? (Array.isArray(cityData.places) ? cityData.places.length : Object.keys(cityData.places).length) : 0,
      keys: cityData ? Object.keys(cityData) : []
    });
    
    if (!cityData) {
      console.warn(`⚠️ Город "${cityName}" не найден`);
      return [];
    }
    
    if (!cityData.places) {
      console.warn(`⚠️ У города "${cityName}" нет массива places`);
      console.log(`📋 Доступные ключи:`, Object.keys(cityData));
      return [];
    }
    
    const places = Array.isArray(cityData.places) ? cityData.places : [];
    
    console.log(`✅ [getPlacesByCityLocal] Получено ${places.length} мест для города "${cityName}"`);
    
    if (places.length > 0) {
      console.log(`📍 Первое место:`, {
        id: places[0].id,
        name: places[0].name,
        category: places[0].category_name
      });
    }
    
    return places;
    
  } catch (error) {
    console.error(`❌ Ошибка получения мест локально для ${cityName}:`, error);
    return [];
  }
}
  // Получить места по категории
  async getPlacesByCategory(cityName, categoryId) {
    const places = await this.getPlacesByCity(cityName);
    return places.filter(place => place.category_id == categoryId);
  }

  // 🔥 ПРИОРИТЕТ FIREBASE: Получить место по ID
  async getPlaceById(city, placeId) {
    try {
      // ✅ ПРИОРИТЕТ 1: Firebase
      if (this.firebaseDB && this.firebaseDB.initialized) {
        console.log(`🔥 [ПРИОРИТЕТ] Получаю место ID:${placeId} из Firebase...`);
        
        try {
          const firebasePlace = await this.getPlaceByIdFirebase(placeId);
          
          if (firebasePlace) {
            console.log(`✅ [FIREBASE] Найдено место: ${firebasePlace.name}`);
            return firebasePlace;
          }
          
          console.log(`📭 Место ID:${placeId} не найдено в Firebase, проверяю локальный файл...`);
        } catch (firebaseError) {
          console.error(`❌ Ошибка Firebase для места ID:${placeId}:`, firebaseError.message);
        }
      }
      
      // ⚠️ FALLBACK: Локальные файлы
      return await this.getPlaceByIdLocal(city, placeId);
      
    } catch (error) {
      console.error(`❌ Ошибка при получении места: ${error.message}`);
      return null;
    }
  }

  // Получить место из Firebase по ID
  async getPlaceByIdFirebase(placeId) {
    try {
      if (!this.firebaseDB || !this.firebaseDB.initialized) {
        return null;
      }
      
      // 🔍 Ищем место во всех городах
      const citiesRef = this.firebaseDB.db.ref('cities');
      const snapshot = await citiesRef.once('value');
      const citiesData = snapshot.val();
      
      if (!citiesData) {
        return null;
      }
      
      // Ищем место по ID во всех городах
      for (const [cityId, cityData] of Object.entries(citiesData)) {
        if (cityData.places) {
          let places = cityData.places;
          
          // Если places - объект, преобразуем в массив
          if (typeof places === 'object' && !Array.isArray(places)) {
            places = Object.values(places);
          }
          
          const place = places.find(p => p.id === placeId);
          if (place) {
            return place;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Ошибка получения места из Firebase:', error);
      return null;
    }
  }

  // Получить место из локального файла по ID
  async getPlaceByIdLocal(city, placeId) {
    try {
      const cityData = await cityManager.getCityData(city);
      const place = cityData.places.find(p => p.id === placeId);
      
      if (!place) {
        console.log(`⚠️ Место с ID ${placeId} не найдено в городе ${city}`);
        return null;
      }
      
      console.log(`✅ Найдено место: ${place.name} в городе ${city}`);
      return place;
    } catch (error) {
      console.error('❌ Ошибка получения места локально:', error);
      return null;
    }
  }

  // 🔥 ПРИОРИТЕТ FIREBASE: Добавить место
  async addPlace(cityName, placeData) {
    try {
      console.log('📝 Добавляю место:', placeData.name);
      
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
        latitude: placeData.latitude || null,
        longitude: placeData.longitude || null,
        google_place_id: placeData.google_place_id || null,
        social_links: placeData.social_links || {},
        city_id: this.generateCityId(cityName),
        city_name: cityName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        photos: []
      };
      
      // Сохраняем фото
      if (placeData.photos && Array.isArray(placeData.photos) && placeData.photos.length > 0) {
        console.log('💾 Сохраняю информацию о фото...');
        
        newPlace.photos = placeData.photos.map(photo => ({
          url: photo.url,
          fileName: photo.fileName,
          uploadedAt: photo.uploadedAt || new Date().toISOString(),
          telegramFileId: photo.telegramFileId || null
        }));
        
        console.log('✅ Информация о фото сохранена:', newPlace.photos.length);
      }
      
      // ✅ ПРИОРИТЕТ 1: Сохраняем в Firebase
      if (this.firebaseDB && this.firebaseDB.initialized) {
        console.log('🔥 [ПРИОРИТЕТ] Сохраняю место в Firebase...');
        
        try {
          await this.savePlaceToFirebase(cityName, newPlace);
          console.log('✅ [FIREBASE] Место сохранено');
        } catch (firebaseError) {
          console.error('❌ Ошибка сохранения в Firebase:', firebaseError.message);
          // Продолжаем с локальным сохранением
        }
      }
      
      // ⚠️ FALLBACK: Сохраняем локально (всегда сохраняем локальную копию)
      console.log('📁 Сохраняю место локально...');
      const saved = await this.savePlaceToLocal(cityName, newPlace);
      
      if (!saved) {
        return {
          success: false,
          message: 'Не удалось сохранить место локально'
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

  // Сохранить место в Firebase
 async savePlaceToFirebase(cityName, placeData) {
  try {
    if (!this.firebaseDB || !this.firebaseDB.initialized) {
      return;
    }
    
    const cityId = this.generateCityId(cityName);
    console.log(`🔥 [savePlaceToFirebase] cityName: "${cityName}", cityId: "${cityId}"`);
    
    // ✅ ПРАВИЛЬНЫЙ ПУТЬ: cities/{cityId}/places/{placeId}
    const cityRef = this.firebaseDB.db.ref(`cities/${cityId}`);
    const snapshot = await cityRef.once('value');
    let cityData = snapshot.val();
    
    if (!cityData) {
      console.log(`⚠️ Город "${cityName}" не найден в Firebase, создаю...`);
      cityData = {
        name: cityName,
        places: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
    
    // Убедимся, что places - объект
    if (!cityData.places || typeof cityData.places !== 'object') {
      cityData.places = {};
    }
    
    // ✅ Добавляем место под его ID
    cityData.places[placeData.id] = placeData;
    cityData.updated_at = new Date().toISOString();
    
    // ✅ Сохраняем весь объект города
    await cityRef.set(cityData);
    
    console.log(`✅ Место "${placeData.name}" сохранено в Firebase в городе "${cityName}"`);
    
  } catch (error) {
    console.error('❌ Ошибка сохранения места в Firebase:', error);
    throw error;
  }
}
  // Сохранить место локально
  async savePlaceToLocal(cityName, placeData) {
    try {
      const cityData = await cityManager.getCityData(cityName);
      
      if (!cityData) {
        console.error('❌ Город не найден');
        return false;
      }
      
      if (!cityData.places) {
        cityData.places = [];
      }
      
      cityData.places.push(placeData);
      
      const saved = await cityManager.saveCityData(cityName, cityData);
      return saved && saved.success;
    } catch (error) {
      console.error('❌ Ошибка сохранения места локально:', error);
      return false;
    }
  }

  async getCityStats(cityName) {
    try {
      const places = await this.getPlacesByCity(cityName);
      
      const stats = {
        totalPlaces: places.length,
        categoriesCount: {}
      };
      
      places.forEach(place => {
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
      const places = await this.getPlacesByCity(cityName);
      const searchQuery = query.toLowerCase();
      
      return places.filter(place => 
        place.name.toLowerCase().includes(searchQuery) ||
        (place.description && place.description.toLowerCase().includes(searchQuery)) ||
        (place.address && place.address.toLowerCase().includes(searchQuery))
      );
      
    } catch (error) {
      console.error('❌ Ошибка при поиске мест:', error);
      return [];
    }
  }

  // 🔥 ПРИОРИТЕТ FIREBASE: Обновить место
  async updatePlace(cityName, placeId, updateData) {
    try {
      console.log(`📝 Обновляю место ID: ${placeId} в городе: "${cityName}"`);
      
      // ✅ ПРИОРИТЕТ 1: Обновляем в Firebase
      if (this.firebaseDB && this.firebaseDB.initialized) {
        console.log('🔥 [ПРИОРИТЕТ] Обновляю место в Firebase...');
        
        try {
          await this.updatePlaceInFirebase(cityName, placeId, updateData);
          console.log('✅ [FIREBASE] Место обновлено');
        } catch (firebaseError) {
          console.error('❌ Ошибка обновления в Firebase:', firebaseError.message);
          // Продолжаем с локальным обновлением
        }
      }
      
      // ⚠️ FALLBACK: Обновляем локально
      console.log('📁 Обновляю место локально...');
      const updated = await this.updatePlaceLocal(cityName, placeId, updateData);
      
      if (!updated) {
        return { success: false, message: 'Место не найдено' };
      }
      
      return { 
        success: true, 
        place: updated,
        message: 'Место успешно обновлено'
      };
      
    } catch (error) {
      console.error('❌ Ошибка updatePlace:', error);
      return { success: false, message: error.message };
    }
  }

  // Обновить место в Firebase
  async updatePlaceInFirebase(cityName, placeId, updateData) {
    try {
      if (!this.firebaseDB || !this.firebaseDB.initialized) {
        return;
      }
      
      const cityId = this.generateCityId(cityName);
      const cityRef = this.firebaseDB.db.ref(`cities/${cityId}`);
      const snapshot = await cityRef.once('value');
      let cityData = snapshot.val();
      
      if (!cityData || !cityData.places) {
        throw new Error('Город или места не найдены в Firebase');
      }
      
      // Ищем место
      let placeFound = false;
      
      if (cityData.places[placeId]) {
        // Если places - объект
        cityData.places[placeId] = {
          ...cityData.places[placeId],
          ...updateData,
          updated_at: new Date().toISOString()
        };
        placeFound = true;
      } else if (Array.isArray(cityData.places)) {
        // Если places - массив
        const placeIndex = cityData.places.findIndex(p => p.id === placeId);
        if (placeIndex !== -1) {
          cityData.places[placeIndex] = {
            ...cityData.places[placeIndex],
            ...updateData,
            updated_at: new Date().toISOString()
          };
          placeFound = true;
        }
      }
      
      if (!placeFound) {
        throw new Error('Место не найдено в Firebase');
      }
      
      cityData.updatedAt = new Date().toISOString();
      await cityRef.set(cityData);
      console.log('✅ Место обновлено в Firebase');
    } catch (error) {
      console.error('❌ Ошибка обновления места в Firebase:', error);
      throw error;
    }
  }

  // Обновить место локально
  async updatePlaceLocal(cityName, placeId, updateData) {
    try {
      const cityData = await cityManager.getCityData(cityName);
      
      if (!cityData || !cityData.places) {
        console.error('❌ Город или места не найдены');
        return null;
      }
      
      const placeIndex = cityData.places.findIndex(p => p.id === placeId);
      
      if (placeIndex === -1) {
        console.error('❌ Место не найдено');
        return null;
      }
      
      cityData.places[placeIndex] = {
        ...cityData.places[placeIndex],
        ...updateData,
        updated_at: new Date().toISOString()
      };
      
      await cityManager.saveCityData(cityName, cityData);
      console.log('✅ Место обновлено локально');
      
      return cityData.places[placeIndex];
    } catch (error) {
      console.error('❌ Ошибка обновления места локально:', error);
      return null;
    }
  }

  // 🔥 ПРИОРИТЕТ FIREBASE: Удалить место
  async deletePlace(cityName, placeId) {
    try {
      console.log(`🗑️ Удаляю место ID: ${placeId} из города: ${cityName}`);
      
      // ✅ ПРИОРИТЕТ 1: Удаляем из Firebase
      if (this.firebaseDB && this.firebaseDB.initialized) {
        console.log('🔥 [ПРИОРИТЕТ] Удаляю место из Firebase...');
        
        try {
          await this.deletePlaceFromFirebase(cityName, placeId);
          console.log('✅ [FIREBASE] Место удалено');
        } catch (firebaseError) {
          console.error('❌ Ошибка удаления из Firebase:', firebaseError.message);
          // Продолжаем с локальным удалением
        }
      }
      
      // ⚠️ FALLBACK: Удаляем локально
      console.log('📁 Удаляю место локально...');
      const deletedPlace = await this.deletePlaceLocal(cityName, placeId);
      
      if (!deletedPlace) {
        return { success: false, message: 'Место не найдено' };
      }
      
      return { 
        success: true, 
        message: `Место "${deletedPlace.name}" удалено`,
        deletedPlace: deletedPlace
      };
      
    } catch (error) {
      console.error('❌ Ошибка deletePlace:', error);
      return { 
        success: false, 
        message: error.message 
      };
    }
  }

  // Удалить место из Firebase
  async deletePlaceFromFirebase(cityName, placeId) {
    try {
      if (!this.firebaseDB || !this.firebaseDB.initialized) {
        return;
      }
      
      const cityId = this.generateCityId(cityName);
      const cityRef = this.firebaseDB.db.ref(`cities/${cityId}`);
      const snapshot = await cityRef.once('value');
      let cityData = snapshot.val();
      
      if (!cityData || !cityData.places) {
        throw new Error('Город или места не найдены в Firebase');
      }
      
      // Удаляем место
      let placeToDelete = null;
      
      if (cityData.places[placeId]) {
        // Если places - объект
        placeToDelete = cityData.places[placeId];
        delete cityData.places[placeId];
      } else if (Array.isArray(cityData.places)) {
        // Если places - массив
        const placeIndex = cityData.places.findIndex(p => p.id === placeId);
        if (placeIndex !== -1) {
          placeToDelete = cityData.places[placeIndex];
          cityData.places.splice(placeIndex, 1);
        }
      }
      
      if (!placeToDelete) {
        throw new Error('Место не найдено в Firebase');
      }
      
      cityData.updatedAt = new Date().toISOString();
      await cityRef.set(cityData);
      console.log('✅ Место удалено из Firebase');
      
      return placeToDelete;
    } catch (error) {
      console.error('❌ Ошибка удаления места из Firebase:', error);
      throw error;
    }
  }

  // Удалить место локально
  async deletePlaceLocal(cityName, placeId) {
    try {
      const cityData = await cityManager.getCityData(cityName);
      
      if (!cityData || !cityData.places) {
        console.error('❌ Город или места не найдены');
        return null;
      }
      
      const placeIndex = cityData.places.findIndex(p => p.id === placeId);
      
      if (placeIndex === -1) {
        console.error('❌ Место не найдено');
        return null;
      }
      
      const placeToDelete = cityData.places[placeIndex];
      cityData.places.splice(placeIndex, 1);
      cityData.updatedAt = new Date().toISOString();
      
      await cityManager.saveCityData(cityName, cityData);
      console.log('✅ Место удалено локально');
      
      return placeToDelete;
    } catch (error) {
      console.error('❌ Ошибка удаления места локально:', error);
      return null;
    }
  }

  // Вспомогательный метод: генерация ID города для Firebase
  generateCityId(cityName) {
    return cityName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }
}

module.exports = new PlaceManager();