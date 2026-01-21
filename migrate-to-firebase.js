const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ✅ Инициализируем Firebase один раз в начале
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Файл serviceAccountKey.json не найден!');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// Исправляем приватный ключ если нужно
if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

// ✅ Инициализируем Firebase один раз с правильными параметрами
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`,
    storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
  });
  console.log('✅ Firebase инициализирован\n');
}

// Теперь загружаем остальные модули
const firebaseDB = require('./utils/firebaseDatabase');
const categoryManager = require('./utils/categoryManager');
const cityManager = require('./utils/cityManager');
const placeManager = require('./utils/placeManager');
const adsManager = require('./utils/adsManager');

async function migrateDataToFirebase() {
  console.log('🚀 Начинаю миграцию данных в Firebase...\n');

  try {
    // Проверяем подключение
    console.log('📡 Проверка подключения к Firebase...');
    const connection = await firebaseDB.testConnection();
    
    if (!connection.success) {
      console.error('❌ Не удалось подключиться к Firebase:', connection.message);
      return;
    }
    console.log('✅ Подключение успешно\n');

    // ============ МИГРАЦИЯ КАТЕГОРИЙ ============
    console.log('📁 Миграция категорий...');
    try {
      const categories = await categoryManager.getAllCategories();
      if (categories && categories.length > 0) {
        const result = await firebaseDB.syncCategoriesToFirebase(categories);
        if (result.success) {
          console.log(`✅ Категории: ${categories.length} успешно загружено\n`);
        } else {
          console.error(`❌ Ошибка при загрузке категорий: ${result.message}\n`);
        }
      } else {
        console.log('⚠️  Нет категорий для миграции\n');
      }
    } catch (error) {
      console.error('❌ Ошибка при миграции категорий:', error.message, '\n');
    }

    // ============ МИГРАЦИЯ ГОРОДОВ ============
    console.log('🏙️  Миграция городов...');
    try {
      const cities = await cityManager.getAllCities();
      if (cities && cities.length > 0) {
        const result = await firebaseDB.syncCitiesToFirebase(cities);
        if (result.success) {
          console.log(`✅ Города: ${cities.length} успешно загружено\n`);
        } else {
          console.error(`❌ Ошибка при загрузке городов: ${result.message}\n`);
        }
      } else {
        console.log('⚠️  Нет городов для миграции\n');
      }
    } catch (error) {
      console.error('❌ Ошибка при миграции городов:', error.message, '\n');
    }

    // ============ МИГРАЦИЯ МЕСТ ============
    console.log('📍 Миграция мест...');
    try {
      const places = await placeManager.getAllPlaces();
      if (places && places.length > 0) {
        const result = await firebaseDB.syncPlacesToFirebase(places);
        if (result.success) {
          console.log(`✅ Места: ${places.length} успешно загружено\n`);
        } else {
          console.error(`❌ Ошибка при загрузке мест: ${result.message}\n`);
        }
      } else {
        console.log('⚠️  Нет мест для миграции\n');
      }
    } catch (error) {
      console.error('❌ Ошибка при миграции мест:', error.message, '\n');
    }

    // ============ МИГРАЦИЯ РЕКЛАМЫ ============
    console.log('📢 Миграция рекламы...');
    try {
      const ads = await adsManager.loadAds();
      if (ads && ads.length > 0) {
        const result = await firebaseDB.syncAdsToFirebase(ads);
        if (result.success) {
          console.log(`✅ Реклама: ${ads.length} успешно загружено\n`);
        } else {
          console.error(`❌ Ошибка при загрузке рекламы: ${result.message}\n`);
        }
      } else {
        console.log('⚠️  Нет рекламы для миграции\n');
      }
    } catch (error) {
      console.error('❌ Ошибка при миграции рекламы:', error.message, '\n');
    }

    console.log('✅ Миграция завершена!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    process.exit(1);
  }
}

// Запускаем миграцию
migrateDataToFirebase();
