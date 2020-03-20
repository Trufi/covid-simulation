# Covid Simulation

Демка: http://artifacts-server.web-staging.2gis.ru/WebMaps/covid-simulation/latest/build/index.html

Для симуляции обязательно в опциях нужно указать URL до данных. Данные можно взять отсюда https://gitlab.2gis.ru/WebMaps/covid-simulation/-/tree/master/assets.

Пример, как можно подключить симуляцию в карту:

```ts
import { Simulation } from '@webmaps/covid-simulation';
import { MapClass, Marker } from '@2gis/jakarta';

const map = new MapClass(document.getElementById('map'), {
    center: [82.93024, 55.01605],
    zoom: 12,
});

// Старт симуляции
const simulation = new Simulation(map, Marker);

simulation.start({
    randomSeed: 15,
    diseaseRange: 30,
    immunityAfter: 15,
    waitAtHome: 2,
    timeOutside: 5,
    humansCount: 4000,
    humansStop: 0,
    diseaseStartCount: 50,
    humanSpeed: 100,
    dataUrl: './assets/nsk.json', // Обязательно нужно указать, где лежат данные для симуляции
});

// Запрос за статистикой
simulation.getStat(); // Вернет SimulationStat[]

interface SimulationStat {
    time: number; // количество мс со старта
    disease: number; // количество больных
    immune: number; // кол-во уже с иммунитетом
    virgin: number; // не тех и не других
}

// Остановка симуляции и удаление всех точек
simulation.stop();
```
