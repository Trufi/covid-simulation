import { Graph } from '../data/graph';
import { Human } from '.';
import { projectMapToGeo } from './utils';
import { config } from './config';

declare const mapgl: any;

function getCircleIcon(color: string, radius: number): string {
    const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="${radius * 2}" height="${radius *
        2}" viewBox="0 0 ${radius * 2} ${radius *
        2}"><circle fill="${color}" cx="${radius}" cy="${radius}" r="${radius}"/></svg>`;
    return `data:image/svg+xml;base64,${btoa(icon)}`;
}

let markersInited = false;
const markers: Array<{ marker: any; state: Human['state'] }> = [];

const alpha = 0.8;
const icons: { [key in Human['state']]: string } = {
    first: getCircleIcon(`rgba(${config.colors.first.join(',')}, ${alpha})`, 5),
    disease: getCircleIcon(`rgba(${config.colors.disease.join(',')}, ${alpha})`, 5),
    immune: getCircleIcon(`rgba(${config.colors.immune.join(',')}, ${alpha})`, 5),
};

let map: any;

export function draw3d(_graph: Graph, humans: Human[]) {
    if (!markersInited && humans.length) {
        map = (window as any).map = new mapgl.Map('map', {
            center: [82.920412, 55.030111],
            zoom: 12,
            key: '042b5b75-f847-4f2a-b695-b5f58adc9dfd',
            zoomControl: false,
        });

        humans.forEach((h) => {
            markers.push({
                marker: new mapgl.Marker(map, {
                    coordinates: projectMapToGeo(h.coords),
                    icon: icons[h.state],
                }),
                state: h.state,
            });
        });
        markersInited = true;
    }

    markers.forEach((m, i) => {
        const human = humans[i];
        m.marker.setCoordinates(projectMapToGeo(human.coords));

        if (m.state !== human.state) {
            m.marker.destroy();
            m.marker = new mapgl.Marker(map, {
                coordinates: projectMapToGeo(human.coords),
                icon: icons[human.state],
            });
            m.state = human.state;
        }
    });
}
