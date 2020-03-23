import * as mat4 from '@2gis/gl-matrix/mat4';
import * as vec2 from '@2gis/gl-matrix/vec2';
import ShaderProgram from '2gl/ShaderProgram';
import Texture from '2gl/Texture';
import Shader from '2gl/Shader';
import Buffer from '2gl/Buffer';
import Vao from '2gl/Vao';
import { RenderContext } from './types';

const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_offset;
    attribute vec2 a_uv;

    uniform mat4 u_mvp;
    uniform vec2 u_size;

    varying vec2 v_uv;

    void main() {
        v_uv = a_uv;
        vec2 inv_half_size = 2.0 / u_size;
        vec4 anchor = u_mvp * vec4(a_position, 0.0, 1.0);
        vec2 pos_2d = anchor.xy + a_offset * inv_half_size * anchor.w;
        gl_Position = vec4(pos_2d, anchor.z, anchor.w);
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_uv;
    void main() {
        gl_FragColor = texture2D(u_texture, v_uv);
    }
`;

const tempMatrix = new Float32Array(16);

const atlasSize = [512, 512];

const offsets = [
    [-1, -1],
    [-1, 1],
    [1, -1],

    [1, 1],
    [1, -1],
    [-1, 1],
];

const uvs = [
    [0, 0],
    [0, 1],
    [1, 0],

    [1, 1],
    [1, 0],
    [0, 1],
];

export type PointIconSize = number | Array<[number, number]>;

export interface PointIcon {
    width: PointIconSize;
    height: PointIconSize;
    url: string;
}

interface AtlasIcon {
    x: number;
    y: number;
    w: number;
    h: number;
}

interface Atlas {
    icons: Array<Array<[number, AtlasIcon]>>;
    imagePromise: Promise<HTMLCanvasElement>;
}

export interface PointBatchEntity {
    position: number[];
    icon: number;
}

interface InnerBufferData {
    array: TypedArray;
    index: number;
}

export class PointBatch {
    private matrix: Mat4;
    private program: ShaderProgram;
    private vao?: Vao;

    private positionData?: InnerBufferData;
    private positionBuffer?: Buffer;

    private uvData?: InnerBufferData;
    private uvBuffer?: Buffer;

    private offsetData?: InnerBufferData;
    private offsetBuffer?: Buffer;

    private atlas: Atlas;
    private texture?: Texture;
    private points: PointBatchEntity[];
    private min: number[];
    private max: number[];
    private vertexCount: number;

    constructor(private renderContext: RenderContext, icons: PointIcon[]) {
        this.matrix = mat4.create();
        this.points = [];
        this.vertexCount = 0;
        this.min = [0, 0];
        this.max = [0, 0];

        this.program = new ShaderProgram({
            vertex: new Shader('vertex', vertexShaderSource),
            fragment: new Shader('fragment', fragmentShaderSource),
            attributes: [{ name: 'a_position' }, { name: 'a_offset' }, { name: 'a_uv' }],
            uniforms: [
                { name: 'u_mvp', type: 'mat4' },
                { name: 'u_size', type: '2fv' },
                { name: 'u_texture', type: '1i' },
            ],
        });

        this.atlas = createAtlas(icons);

        this.atlas.imagePromise.then((canvas) => {
            this.texture = new Texture(canvas, {
                flipY: false,
                unit: 0,
                magFilter: Texture.LinearFilter,
                minFilter: Texture.LinearFilter,
            });
        });
    }

    public setPoints(points: PointBatchEntity[], min: number[], max: number[]) {
        this.clear();

        this.points = points;
        this.min = min;
        this.max = max;

        const verticesPerPoint = 6;
        this.vertexCount = points.length * verticesPerPoint;

        this.positionData = {
            array: new Float32Array(this.vertexCount * verticesPerPoint),
            index: 0,
        };
        this.offsetData = {
            array: new Int16Array(this.vertexCount * 2),
            index: 0,
        };
        this.uvData = {
            array: new Uint16Array(this.vertexCount * 2),
            index: 0,
        };

        const { gl } = this.renderContext;
        this.positionBuffer = new Buffer(this.positionData.array, {
            itemSize: 2,
            dataType: Buffer.Float,
        });
        this.positionBuffer.drawType = Buffer.DynamicDraw;
        this.positionBuffer.prepare(gl);

        this.offsetBuffer = new Buffer(this.offsetData.array, {
            itemSize: 2,
            dataType: Buffer.Short,
        });
        this.offsetBuffer.drawType = Buffer.DynamicDraw;
        this.offsetBuffer.prepare(gl);

        this.uvBuffer = new Buffer(this.uvData.array, {
            itemSize: 2,
            dataType: Buffer.UnsignedShort,
            normalized: true,
        });
        this.uvBuffer.drawType = Buffer.DynamicDraw;
        this.uvBuffer.prepare(gl);

        this.vao = new Vao(this.program, {
            a_position: this.positionBuffer,
            a_offset: this.offsetBuffer,
            a_uv: this.uvBuffer,
        });
    }

    public render(cameraMatrix: Mat4, mapSize: number[], mapZoom: number) {
        if (!this.vao || !this.texture) {
            return;
        }

        this.updatePoints(mapZoom);

        const { gl } = this.renderContext;
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        mat4.multiply(tempMatrix, cameraMatrix, this.matrix);
        this.texture.enable(gl);

        this.program.enable(gl).bind(gl, {
            u_mvp: tempMatrix,
            u_size: [mapSize[0] * window.devicePixelRatio, mapSize[1] * window.devicePixelRatio],
            u_texture: 0,
        });

        this.vao.bind(this.renderContext);

        gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
    }

    private updatePoints(mapZoom: number) {
        const positionData = this.positionData;
        const offsetData = this.offsetData;
        const uvData = this.uvData;

        if (
            !positionData ||
            !uvData ||
            !offsetData ||
            !this.positionBuffer ||
            !this.offsetBuffer ||
            !this.uvBuffer
        ) {
            return;
        }

        positionData.index = 0;
        offsetData.index = 0;
        uvData.index = 0;

        const size = [this.max[0] - this.min[0], this.max[1] - this.min[1]];
        mat4.fromTranslationScale(
            this.matrix,
            [this.min[0], this.min[1], 0],
            [size[0], size[1], 1],
        );
        const invSize = [1 / size[0], 1 / size[1]];

        const tempPosition = [0, 0];

        const icons = this.atlas.icons.map((zoomIcons) => {
            let result = zoomIcons[0][1];

            for (let i = 0; i < zoomIcons.length; i++) {
                const [zoom, icon] = zoomIcons[i];
                if (zoom > mapZoom) {
                    break;
                }
                result = icon;
            }

            return result;
        });

        this.points.forEach((point) => {
            const icon = icons[point.icon];

            vec2.sub(tempPosition, point.position, this.min);
            vec2.multiply(tempPosition, tempPosition, invSize);

            for (let i = 0; i < 6; i++) {
                positionData.array[positionData.index++] = tempPosition[0];
                positionData.array[positionData.index++] = tempPosition[1];

                const offset = offsets[i];
                offsetData.array[offsetData.index++] = (offset[0] * icon.w) / 2;
                offsetData.array[offsetData.index++] = (offset[1] * icon.h) / 2;

                const uv = uvs[i];
                uvData.array[uvData.index++] = Math.floor(
                    ((icon.x + uv[0] * icon.w) / atlasSize[0]) * 65535,
                );
                uvData.array[uvData.index++] = Math.floor(
                    ((icon.y + uv[1] * icon.h) / atlasSize[1]) * 65535,
                );
            }
        });

        const { gl } = this.renderContext;
        this.positionBuffer.subData(gl, 0, positionData.array);
        this.offsetBuffer.subData(gl, 0, offsetData.array);
        this.uvBuffer.subData(gl, 0, uvData.array);
    }

    private clear() {
        this.vao?.remove();
        this.positionBuffer?.remove();
        this.uvBuffer?.remove();
        this.offsetBuffer?.remove();
    }
}

function loadImage(url: string) {
    return new Promise<HTMLImageElement>((resolve) => {
        const img = document.createElement('img');
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.src = url;
    });
}

function createAtlas(sourceIcons: PointIcon[]) {
    const margin = 1;

    let x = 0;
    const y = margin;

    const icons: Array<Array<[number, AtlasIcon]>> = [];

    sourceIcons.forEach(({ width, height }, index) => {
        const curveWidth: Array<[number, number]> =
            typeof width === 'number' ? [[0, width]] : width;
        const curveHeight: Array<[number, number]> =
            typeof height === 'number' ? [[0, height]] : height;

        icons[index] = [];

        for (let i = 0; i < curveWidth.length; i++) {
            x += margin;
            const w = curveWidth[i][1] * window.devicePixelRatio;
            const h = curveHeight[i][1] * window.devicePixelRatio;
            const icon: AtlasIcon = { x, y, w, h };
            x += margin + w;
            icons[index].push([curveWidth[i][0], icon]);
        }
    });

    const promises = sourceIcons.map((icon) => loadImage(icon.url));

    const imagePromise = Promise.all(promises).then((images) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

        canvas.width = atlasSize[0];
        canvas.height = atlasSize[1];

        images.forEach((img, i) => {
            icons[i].forEach(([, icon]) => {
                ctx.drawImage(img, icon.x, icon.y, icon.w, icon.h);
            });
        });

        return canvas;
    });

    return {
        icons,
        imagePromise,
    };
}
