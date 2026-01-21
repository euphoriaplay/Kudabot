const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

class FirebaseDatabase {
  constructor() {
    this.db = null;
    this.initialized = false;
    
    try {
      console.log('🔧 Инициализация Firebase Realtime Database...');
      
      // Путь к JSON файлу с ключом
      const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
      
      if (!fs.existsSync(serviceAccountPath)) {
        console.error(`❌ Файл с ключом Firebase не найден: ${serviceAccountPath}`);
        return;
      }

      // Читаем файл вручную и исправляем приватный ключ
      const rawData = fs.readFileSync(serviceAccountPath, 'utf8');
      
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(rawData);
      } catch (parseError) {
        console.error('❌ Ошибка парсинга JSON:', parseError.message);
        return;
      }
      
      // Исправляем приватный ключ
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      
      if (!admin.apps.length) {
        try {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
          });
          console.log('✅ Firebase Admin SDK инициализирован для Realtime Database');
        } catch (initError) {
          console.error('❌ Ошибка инициализации Firebase:', initError.message);
          return;
        }
      } else {
        console.log('✅ Firebase уже инициализирован');
      }
      
      this.db = admin.database();
      console.log('✅ Firebase Realtime Database инициализирована');
      this.initialized = true;
      
    } catch (error) {
      console.error('❌ Критическая ошибка инициализации Firebase Database:', error.message);
    }
  }

  // ============ КАТЕГОРИИ ============
  async getAllCategories() {
    try {
      if (!this.initialized) {
        console.warn('⚠️  Firebase Database не инициализирована');
        return null;
      }

      const ref = this.db.ref('categories');
      const snapshot = await ref.once('value');
      const data = snapshot.val();
      
      console.log('✅ [Firebase] Категории получены');
      return data ? Object.values(data) : [];
    } catch (error) {
      console.error('❌ Ошибка при получении категорий:', error.message);
      return null;
    }
  }

  async getCategory(categoryId) {
    try {
      if (!this.initialized) return null;

      const ref = this.db.ref(`categories/${categoryId}`);
      const snapshot = await ref.once('value');
      
      return snapshot.val();
    } catch (error) {
      console.error('❌ Ошибка при получении категории:', error.message);
      return null;
    }
  }

  async saveCategory(categoryId, categoryData) {
    try {
      if (!this.initialized) {
        throw new Error('Firebase Database не инициализирована');
      }

      const ref = this.db.ref(`categories/${categoryId}`);
      await ref.set(categoryData);
      
      console.log(`✅ [Firebase] Категория "${categoryData.name}" сохранена`);
      return { success: true, message: 'Категория сохранена' };
    } catch (error) {
      console.error('❌ Ошибка при сохранении категории:', error.message);
      return { success: false, message: error.message };
    }
  }

  async deleteCategory(categoryId) {
    try {
      if (!this.initialized) throw new Error('Firebase Database не инициализирована');

      const ref = this.db.ref(`categories/${categoryId}`);
      await ref.remove();
      
      console.log(`✅ [Firebase] Категория удалена`);
      return { success: true, message: 'Категория удалена' };
    } catch (error) {
      console.error('❌ Ошибка при удалении категории:', error.message);
      return { success: false, message: error.message };
    }
  }

  // ============ ГОРОДА ============
  async getAllCities() {
    try {
      if (!this.initialized) return null;

      const ref = this.db.ref('cities');
      const snapshot = await ref.once('value');
      const data = snapshot.val();
      
      console.log('✅ [Firebase] Города получены');
      return data ? Object.values(data) : [];
    } catch (error) {
      console.error('❌ Ошибка при получении городов:', error.message);
      return null;
    }
  }

  async getCity(cityId) {
    try {
      if (!this.initialized) return null;

      const ref = this.db.ref(`cities/${cityId}`);
      const snapshot = await ref.once('value');
      
      return snapshot.val();
    } catch (error) {
      console.error('❌ Ошибка при получении города:', error.message);
      return null;
    }
  }

  async saveCity(cityId, cityData) {
    try {
      if (!this.initialized) {
        throw new Error('Firebase Database не инициализирована');
      }

      const ref = this.db.ref(`cities/${cityId}`);
      await ref.set(cityData);
      
      console.log(`✅ [Firebase] Город "${cityData.name}" сохранен`);
      return { success: true, message: 'Город сохранен' };
    } catch (error) {
      console.error('❌ Ошибка при сохранении города:', error.message);
      return { success: false, message: error.message };
    }
  }

  async deleteCity(cityId) {
    try {
      if (!this.initialized) throw new Error('Firebase Database не инициализирована');

      const ref = this.db.ref(`cities/${cityId}`);
      await ref.remove();
      
      console.log(`✅ [Firebase] Город удален`);
      return { success: true, message: 'Город удален' };
    } catch (error) {
      console.error('❌ Ошибка при удалении города:', error.message);
      return { success: false, message: error.message };
    }
  }

  // ============ МЕСТА ============
  async getAllPlaces() {
    try {
      if (!this.initialized) return null;

      const ref = this.db.ref('places');
      const snapshot = await ref.once('value');
      const data = snapshot.val();
      
      console.log('✅ [Firebase] Все места получены');
      return data ? Object.values(data) : [];
    } catch (error) {
      console.error('❌ Ошибка при получении мест:', error.message);
      return null;
    }
  }

  async getCityPlaces(cityId) {
    try {
      if (!this.initialized) return null;

      const ref = this.db.ref('places').orderByChild('city_id').equalTo(cityId);
      const snapshot = await ref.once('value');
      const data = snapshot.val();
      
      return data ? Object.values(data) : [];
    } catch (error) {
      console.error('❌ Ошибка при получении мест города:', error.message);
      return null;
    }
  }

  async getPlace(placeId) {
    try {
      if (!this.initialized) return null;

      const ref = this.db.ref(`places/${placeId}`);
      const snapshot = await ref.once('value');
      
      return snapshot.val();
    } catch (error) {
      console.error('❌ Ошибка при получении места:', error.message);
      return null;
    }
  }

  async savePlace(placeId, placeData) {
    try {
      if (!this.initialized) {
        throw new Error('Firebase Database не инициализирована');
      }

      const ref = this.db.ref(`places/${placeId}`);
      await ref.set(placeData);
      
      console.log(`✅ [Firebase] Место "${placeData.name}" сохранено`);
      return { success: true, message: 'Место сохранено' };
    } catch (error) {
      console.error('❌ Ошибка при сохранении места:', error.message);
      return { success: false, message: error.message };
    }
  }

  async deletePlace(placeId) {
    try {
      if (!this.initialized) throw new Error('Firebase Database не инициализирована');

      const ref = this.db.ref(`places/${placeId}`);
      await ref.remove();
      
      console.log(`✅ [Firebase] Место удалено`);
      return { success: true, message: 'Место удалено' };
    } catch (error) {
      console.error('❌ Ошибка при удалении места:', error.message);
      return { success: false, message: error.message };
    }
  }

  // ============ СИНХРОНИЗАЦИЯ ДАННЫХ ============
  async syncCategoriesToFirebase(categories) {
    try {
      if (!this.initialized) throw new Error('Firebase Database не инициализирована');

      const ref = this.db.ref('categories');
      
      // Преобразуем массив в объект с ID в качестве ключей
      const categoriesObj = {};
      categories.forEach(cat => {
        categoriesObj[cat.id] = cat;
      });
      
      await ref.set(categoriesObj);
      console.log(`✅ [Firebase] ${categories.length} категорий синхронизировано`);
      return { success: true };
    } catch (error) {
      console.error('❌ Ошибка при синхронизации категорий:', error.message);
      return { success: false, message: error.message };
    }
  }

  async syncCitiesToFirebase(cities) {
    try {
      if (!this.initialized) throw new Error('Firebase Database не инициализирована');

      const ref = this.db.ref('cities');
      
      const citiesObj = {};
      cities.forEach((city, index) => {
        citiesObj[`city_${index}`] = { id: index, name: city };
      });
      
      await ref.set(citiesObj);
      console.log(`✅ [Firebase] ${cities.length} городов синхронизировано`);
      return { success: true };
    } catch (error) {
      console.error('❌ Ошибка при синхронизации городов:', error.message);
      return { success: false, message: error.message };
    }
  }

  async syncPlacesToFirebase(places) {
    try {
      if (!this.initialized) throw new Error('Firebase Database не инициализирована');

      const ref = this.db.ref('places');
      
      const placesObj = {};
      places.forEach((place, index) => {
        placesObj[place.id || `place_${index}`] = place;
      });
      
      await ref.set(placesObj);
      console.log(`✅ [Firebase] ${places.length} мест синхронизировано`);
      return { success: true };
    } catch (error) {
      console.error('❌ Ошибка при синхронизации мест:', error.message);
      return { success: false, message: error.message };
    }
  }

  // ============ РЕКЛАМА ============
  async getAllAds() {
    try {
      if (!this.initialized) return null;

      const ref = this.db.ref('ads');
      const snapshot = await ref.once('value');
      const data = snapshot.val();
      
      console.log('✅ [Firebase] Реклама получена');
      return data ? Object.values(data) : [];
    } catch (error) {
      console.error('❌ Ошибка при получении рекламы:', error.message);
      return null;
    }
  }

  async saveAd(adId, adData) {
    try {
      if (!this.initialized) return { success: false, message: 'Firebase не инициализирована' };

      const ref = this.db.ref(`ads/${adId}`);
      await ref.set(adData);
      
      console.log(`✅ [Firebase] Реклама "${adData.text.substring(0, 50)}..." сохранена`);
      return { success: true, message: 'Реклама сохранена' };
    } catch (error) {
      console.error('❌ Ошибка при сохранении рекламы:', error.message);
      return { success: false, message: error.message };
    }
  }

  async deleteAd(adId) {
    try {
      if (!this.initialized) return { success: false, message: 'Firebase не инициализирована' };

      const ref = this.db.ref(`ads/${adId}`);
      await ref.remove();
      
      console.log(`✅ [Firebase] Реклама ${adId} удалена`);
      return { success: true, message: 'Реклама удалена' };
    } catch (error) {
      console.error('❌ Ошибка при удалении рекламы:', error.message);
      return { success: false, message: error.message };
    }
  }

  async syncAdsToFirebase(ads) {
    try {
      if (!this.initialized) return { success: false, message: 'Firebase не инициализирована' };

      if (!ads || ads.length === 0) {
        console.log('⚠️  Нет рекламы для синхронизации');
        return { success: true };
      }

      const ref = this.db.ref('ads');
      const adsObj = {};
      
      ads.forEach(ad => {
        adsObj[ad.id] = ad;
      });
      
      await ref.set(adsObj);
      console.log(`✅ [Firebase] ${ads.length} рекламы синхронизировано`);
      return { success: true };
    } catch (error) {
      console.error('❌ Ошибка при синхронизации рекламы:', error.message);
      return { success: false, message: error.message };
    }
  }

  // ============ ПРОВЕРКА ПОДКЛЮЧЕНИЯ ============
  async testConnection() {
    try {
      if (!this.initialized) {
        return { success: false, message: 'Firebase не инициализирована' };
      }

      // Пытаемся прочитать корень базы - это безопасный способ проверить подключение
      const ref = this.db.ref('/');
      const snapshot = await ref.once('value', null, (error) => {
        if (error) {
          throw new Error(`Firebase ошибка: ${error.message}`);
        }
      });
      
      console.log('✅ Firebase Realtime Database подключена');
      return { success: true, message: 'Подключено к Firebase' };
    } catch (error) {
      console.error('❌ Ошибка при проверке подключения:', error.message);
      return { success: false, message: `Нет соединения с Firebase: ${error.message}` };
    }
  }
}

module.exports = new FirebaseDatabase();
