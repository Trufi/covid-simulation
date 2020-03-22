# Covid Simulation

Демка: http://artifacts-server.web-staging.2gis.ru/WebMaps/covid-simulation/latest/build/index.html

Для симуляции обязательно в опциях нужно указать URL до данных. Данные можно взять отсюда https://gitlab.2gis.ru/WebMaps/covid-simulation/-/tree/master/assets.

Пример, как можно подключить симуляцию в карту:

```ts
import { Simulation } from '@webmaps/covid-simulation';
import { MapClass } from '@2gis/jakarta';

const map = new MapClass(document.getElementById('map'), {
    center: [82.93024, 55.01605],
    zoom: 12,
});

const icons = {
    virgin: { width: 10, height: 10, url: 'VIRGIN_ICON_URL' },
    desease: { width: 10, height: 10, url: 'DESEASE_ICON_URL' },
    immune: { width: 10, height: 10, url: 'IMMUNE_ICON_URL' },
};

// Старт симуляции
const simulation = new Simulation(map, { icons });

simulation.start({
    randomSeed: 15,
    diseaseRange: 1,
    immunityAfter: 10,
    waitAtHome: 2,
    timeOutside: 5,
    humansCount: 4000,
    humansStop: 0,
    diseaseStartCount: 50,
    humanSpeed: 100,
    humanDeviation: 0.5,
    dataUrl: './assets/nsk.json', // Обязательно нужно указать, где лежат данные для симуляции
});

// Запрос за статистикой
const stats = simulation.getStat(); // Вернет SimulationStat[]

// Остановка симуляции и удаление всех точек
simulation.stop();
```

где:

```ts
interface SimulationStartOptions {
    /**
     * Весь рандом в симуляции детерминированные, это его первоначальное зерно
     */
    randomSeed: number;

    /**
     * Расстояние в метрах, через которое передается заражение
     */
    diseaseRange: number;

    /**
     * Время в секундах, через которое наступает имуннитет после заражения
     */
    immunityAfter: number;

    /**
     * Время в секундах, которое человек проводит в доме, после того как в него зайдет
     */
    waitAtHome: number;

    /**
     * Время в секундах, которое человек проводит на улице, после чего будет первым делом будет стараться заходить в дом
     */
    timeOutside: number;

    /**
     * Относительное отклонение параметров immunityAfter, waitAtHome, timeOutside.
     * Принимает значения от 0 до 1.
     * Итоговый параметр для каждого человека высчитывается по формуле:
     * parameter = parameter + (random() - 0.5) * humanDeviation * parameter
     */
    humanDeviation: number;

    /**
     * Общее количество людей
     */
    humansCount: number;

    /**
     * Количество людей, которое никогда не будет двигаться. Такие люди появляются сразу в домах.
     */
    humansStop: number;

    /**
     * Количество людей, которые заражены при старте
     */
    diseaseStartCount: number;

    /**
     * Скорость людей в папугаях
     */
    humanSpeed: number;

    /**
     * URL, с которого будут скачиваться данные для симуляции
     */
    dataUrl: string;
}

interface SimulationStat {
    time: number; // количество мс со старта
    disease: number; // количество больных
    immune: number; // кол-во уже с иммунитетом
    virgin: number; // не тех и не других
}
```
