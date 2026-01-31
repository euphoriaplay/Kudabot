const fs = require('fs').promises;
const path = require('path');

async function migrate() {
  try {
    console.log('🔄 Начинаю миграцию данных...');
    
    // Читаем список городов
    const citiesPath = path.join(__dirname, 'data', 'cities.json');
    const citiesData = await fs.readFile(citiesPath, 'utf-8');
    const cities = JSON.parse(citiesData);
    
    console.log(`📋 Найдено городов: ${cities.length}`);
    
    for (const cityName of cities) {
      console.log(`\n🏙️ Обрабатываю город: ${cityName}`);
      
      // Генерируем имя файла
      const fileName = cityName
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9а-я]/gi, '') + '.json';
      
      const filePath = path.join(__dirname, 'data', fileName);
      
      // Проверяем существует ли файл
      try {
        const fileData = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(fileData);
        
        // Проверяем структуру
        if (!data.places) {
          console.log(`  ⚠️ Файл существует, но нет массива places. Добавляю...`);
          data.places = [];
          data.updated_at = new Date().toISOString();
          
          await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
          console.log(`  ✅ Структура обновлена`);
        } else {
          console.log(`  ✅ Файл в порядке (${data.places.length} мест)`);
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log(`  📝 Файл не существует. Создаю новый...`);
          
          const newCityData = {
            name: cityName,
            places: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          await fs.writeFile(filePath, JSON.stringify(newCityData, null, 2), 'utf-8');
          console.log(`  ✅ Создан файл: ${fileName}`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('\n✅ Миграция завершена!');
    
  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
  }
}

migrate();