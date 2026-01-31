const config = {
  // Режимы работы:
  // - 'firebase-only': только Firebase (рекомендуется для продакшена)
  // - 'firebase-first': сначала Firebase, потом локальные файлы
  // - 'local-only': только локальные файлы (для разработки)
  MODE: process.env.BOT_MODE || 'firebase-first',
  
  // Настройки Firebase
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
  
  // Интервал синхронизации (в миллисекундах)
  SYNC_INTERVAL: 300000, // 5 минут
  
  // Максимальное количество попыток при ошибках Firebase
  MAX_RETRIES: 3,
  
  // Включить логирование операций с Firebase
  LOG_FIREBASE_OPERATIONS: true
};

module.exports = config;