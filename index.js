require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const Bot = require('./bot');
const fs = require('fs-extra');
const path = require('path');
const fileSyncManager = require('./utils/fileSyncManager');


// Создаем папку для загрузок если её нет
const uploadsDir = path.join(__dirname, 'uploads');
const photosDir = path.join(uploadsDir, 'photos');
const tempDir = path.join(uploadsDir, 'temp');

try {
  fs.ensureDirSync(photosDir);
  fs.ensureDirSync(tempDir);
  console.log('✅ Папки для загрузок созданы');
} catch (error) {
  console.error('❌ Ошибка при создании папок:', error);
}

const token = process.env.BOT_TOKEN;
const adminIds = process.env.ADMIN_IDS ? 
  process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim())) : [];

console.log('⚙️ Загружены ID админов:', adminIds);

if (!token) {
  console.error('❌ BOT_TOKEN не найден в .env файле!');
  process.exit(1);
}

const bot = new TelegramBot(token, {
  polling: true,
  request: {
    url: 'https://api.telegram.org'
  }
});

// Передаем токен в конструктор Bot
const cityBot = new Bot(bot, adminIds, token);

// Запускаем автоматическую синхронизацию файлов с Firebase
const dataDir = path.join(__dirname, 'data');
fileSyncManager.startWatching(dataDir);

// Обработка завершения приложения
process.on('SIGINT', () => {
  console.log('\n👋 Завершаю работу бота...');
  fileSyncManager.stopWatching();
  process.exit(0);
});

// Логирование
bot.on('message', (msg) => {
  const user = msg.from.first_name;
  const userId = msg.from.id;
  const text = msg.text || 'не текст';
  const isAdmin = adminIds.includes(userId);
  
  console.log(`${new Date().toLocaleString()} | ${isAdmin ? '👑' : '👤'} ${user} (ID: ${userId}): ${text}`);
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error.code);
});

console.log('🏙️ Бот-гид запущен!');
console.log('📁 Данные городов хранятся в папке data/');
console.log('📸 Фото сохраняются в папке uploads/');