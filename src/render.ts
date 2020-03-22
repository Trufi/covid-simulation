import * as vec2 from '@2gis/gl-matrix/vec2';
import { Human, RenderContext, SimulationIcons } from './types';
import { PointBatch, PointBatchEntity } from './pointBatch';

interface RenderPoint {
    state: Human['state'];
    human: Human;
    point: PointBatchEntity;
}

const iconTypeToIndex: { [key in Human['state']]: number } = {
    virgin: 0,
    disease: 1,
    immune: 2,
};

export class Render {
    private canvas: HTMLCanvasElement;
    private renderContext: RenderContext;
    private pointBatch: PointBatch;
    private points: RenderPoint[];

    constructor(private map: import('@2gis/jakarta').Map, icons: SimulationIcons) {
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = '0';
        this.canvas.style.top = '0';
        this.canvas.style.pointerEvents = 'none';

        const mapCanvas = map.modules.container.querySelector('canvas');
        const mapCanvasNextSibling = mapCanvas?.nextSibling;
        if (!mapCanvas) {
            throw new Error('Map canvas not found');
        }
        if (!mapCanvasNextSibling) {
            throw new Error('Map html markers container not found');
        }

        map.modules.container.insertBefore(this.canvas, mapCanvasNextSibling);

        this.points = [];

        const gl = this.canvas.getContext('webgl', {
            antialias: true,
            alpha: true,
        }) as WebGLRenderingContext;

        const extensions = {
            OES_vertex_array_object: gl.getExtension(
                'OES_vertex_array_object',
            ) as OES_vertex_array_object,
        };

        this.renderContext = {
            gl,
            extensions,
        };

        window.addEventListener('resize', this.updateSize);
        this.updateSize();

        gl.clearColor(1, 1, 1, 0);

        this.pointBatch = new PointBatch(this.renderContext, [
            icons.virgin,
            icons.disease,
            icons.immune,
        ]);
    }

    public setPoints(humans: Human[], min: number[], max: number[]) {
        this.points = [];

        this.points = humans.map((human) => ({
            state: human.state,
            human,
            point: {
                icon: iconTypeToIndex[human.state],
                position: [human.coords[0], human.coords[1]],
            },
        }));

        this.pointBatch.setPoints(
            this.points.map((p) => p.point),
            min,
            max,
        );
    }

    public render() {
        this.points.forEach(({ point, human }) => {
            point.icon = iconTypeToIndex[human.state];
            vec2.copy(point.position, human.coords);
        });

        const cameraMatrix = this.map.modules.renderer.vpMatrix;
        this.pointBatch.render(cameraMatrix, this.map.getSize());
    }

    private updateSize = () => {
        const size = this.map.getSize();

        this.canvas.width = size[0] * window.devicePixelRatio;
        this.canvas.height = size[1] * window.devicePixelRatio;
        this.canvas.style.width = size[0] + 'px';
        this.canvas.style.height = size[1] + 'px';

        this.renderContext.gl.viewport(
            0,
            0,
            size[0] * window.devicePixelRatio,
            size[1] * window.devicePixelRatio,
        );
    };
}
