export function coordinatesPrecision(zoom: number): number {
    return Math.ceil((zoom * Math.LN2 + Math.log(256 / 360 / 0.5)) / Math.LN10);
}

export function throttle(fn: (...args: any[]) => void, time: number) {
    let lock = false;
    let savedArgs: any[] | undefined;

    function later() {
        lock = false;
        if (savedArgs) {
            wrapperFn(...savedArgs);
            savedArgs = undefined;
        }
    }

    function wrapperFn(...args: any[]) {
        if (lock) {
            savedArgs = args;
        } else {
            fn(...args);
            setTimeout(later, time);
            lock = true;
        }
    }

    return wrapperFn;
}

export function parseQuery() {
    const res: { [key: string]: string } = {};
    const parts = location.search.slice(1);

    if (parts === '') {
        return res;
    }

    parts
        .split('&')
        .map((str) => str.split('='))
        .forEach((couple) => {
            res[couple[0]] = couple[1];
        });
    return res;
}

export function getCircleIcon(color: string, radius: number): string {
    const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="${radius * 2}" height="${radius *
        2}" viewBox="0 0 ${radius * 2} ${radius *
        2}"><circle fill="${color}" cx="${radius}" cy="${radius}" r="${radius}"/></svg>`;
    return `data:image/svg+xml;base64,${btoa(icon)}`;
}
