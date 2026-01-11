// Утилита для добавления администраторов
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

// Проверяем существование .env файла
if (!fs.existsSync(envPath)) {
  console.error('❌ Файл .env не найден!');
  process.exit(1);
}

// Читаем текущий .env
let envContent = fs.readFileSync(envPath, 'utf8');

// Получаем аргументы командной строки
const newAdminIds = process.argv.slice(2);

if (newAdminIds.length === 0) {
  console.log('📝 Использование: npm run add-admin -- ID1 ID2 ID3');
  console.log('📝 Пример: npm run add-admin -- 123456789 987654321');
  process.exit(0);
}

// Обновляем ADMIN_IDS
const adminIdsMatch = envContent.match(/ADMIN_IDS=(.*)/);
if (adminIdsMatch) {
  const currentIds = adminIdsMatch[1].split(',').map(id => id.trim()).filter(id => id);
  const allIds = [...new Set([...currentIds, ...newAdminIds])];
  envContent = envContent.replace(
    /ADMIN_IDS=.*/,
    `ADMIN_IDS=${allIds.join(',')}`
  );
} else {
  // Если переменной нет, добавляем её
  envContent += `\nADMIN_IDS=${newAdminIds.join(',')}`;
}

// Записываем обратно
fs.writeFileSync(envPath, envContent, 'utf8');

console.log('✅ Администраторы успешно добавлены!');
console.log(`📋 Текущие ID админов: ${envContent.match(/ADMIN_IDS=(.*)/)[1]}`);