const firebaseDB = require('./utils/firebaseDatabase');
const cityManager = require('./utils/cityManager');
const placeManager = require('./utils/placeManager');
const categoryManager = require('./utils/categoryManager');
const adsManager = require('./utils/adsManager');


// Ждем инициализации Firebase
const waitForFirebase = async () => {
  console.log('⏳ Ожидаю инициализацию Firebase...');
  
  let attempts = 0;
  const maxAttempts = 30; // 30 попыток по 1 секунде = 30 секунд
  
  while (attempts < maxAttempts) {
    if (firebaseDB.initialized) {
      console.log('✅ Firebase успешно инициализирован');
      return true;
    }
    
    attempts++;
    console.log(`⏳ Попытка ${attempts}/${maxAttempts}...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.error('❌ Не удалось инициализировать Firebase за отведенное время');
  return false;
};

// Устанавливаем Firebase во все менеджеры
const initializeAllManagers = async () => {
  try {
    const firebaseReady = await waitForFirebase();
    
    if (!firebaseReady) {
      console.warn('⚠️ Firebase не доступен, работаем в офлайн*режиме');
      return;
    }
    
    // Инициализируем все менеджеры с Firebase
    const placeManager = require('./utils/placeManager');
    const cityManager = require('./utils/cityManager');
    const categoryManager = require('./utils/categoryManager');
    const adsManager = require('./utils/adsManager');
    
    placeManager.setFirebaseDB(firebaseDB);
    cityManager.setFirebaseDB(firebaseDB);
    categoryManager.setFirebaseDB(firebaseDB);
    adsManager.setFirebaseDB(firebaseDB);
    
    console.log('✅ Все менеджеры подключены к Firebase');
    
    // Запускаем принудительную синхронизацию при старте
    setTimeout(() => {
      firebaseDB.forceSync();
    }, 5000);
    
  } catch (error) {
    console.error('❌ Ошибка инициализации менеджеров:', error);
  }
};

// Экспортируем функцию инициализации
module.exports = {
  initializeAllManagers,
  firebaseDB
};