import { Human } from './types';
import { projectMapToGeo } from './utils';

interface RenderPoint {
    marker: import('@2gis/jakarta').Marker;
    state: Human['state'];
    human: Human;
}

const colors = {
    virgin: [170, 198, 202],
    disease: [187, 100, 29],
    immune: [203, 138, 192],
};
const alpha = 0.8;
const icons: { [key in Human['state']]: string } = {
    virgin: getCircleIcon(`rgba(${colors.virgin.join(',')}, ${alpha})`, 5),
    disease: getCircleIcon(`rgba(${colors.disease.join(',')}, ${alpha})`, 5),
    immune: getCircleIcon(`rgba(${colors.immune.join(',')}, ${alpha})`, 5),
};

function getCircleIcon(color: string, radius: number): string {
    const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="${radius * 2}" height="${radius *
        2}" viewBox="0 0 ${radius * 2} ${radius *
        2}"><circle fill="${color}" cx="${radius}" cy="${radius}" r="${radius}"/></svg>`;
    return `data:image/svg+xml;base64,${btoa(icon)}`;
}

export class EasyRender {
    private points: RenderPoint[];

    constructor(
        private map: import('@2gis/jakarta').Map,
        private Marker: typeof import('@2gis/jakarta').Marker,
    ) {
        this.points = [];
    }

    public setPoints(humans: Human[]) {
        this.points.forEach((point) => point.marker.destroy());
        this.points = [];

        humans.forEach((human) => {
            const point: RenderPoint = {
                marker: this.createMarker(human),
                state: human.state,
                human,
            };
            this.points.push(point);
        });
    }

    public render() {
        this.updatePoints();
    }

    private updatePoints() {
        this.points.forEach((point) => {
            if (point.state !== point.human.state) {
                point.marker.destroy();
                point.marker = this.createMarker(point.human);
                point.state = point.human.state;
            } else {
                point.marker.setCoordinates(projectMapToGeo(point.human.coords));
            }
        });
    }

    private createMarker(human: Human) {
        return new this.Marker(this.map, {
            coordinates: projectMapToGeo(human.coords),
            icon: icons[human.state],
        });
    }
}
