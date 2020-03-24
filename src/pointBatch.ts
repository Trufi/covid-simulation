import * as mat4 from '@2gis/gl-matrix/mat4';
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
    /**
     * index -> zoom, element -> [index -> type, element -> Icon]
     */
    icons: AtlasIcon[][];
    imagePromise: Promise<HTMLCanvasElement>;
}

export interface PointBatchEntity {
    position: number[];
    icon: number;
}

interface InnerData {
    position: InnerBufferData;
    offset: InnerBufferData;
    uv: InnerBufferData;
}

interface InnerBufferData {
    array: TypedArray;
    index: number;
}

export class PointBatch {
    private matrix: Mat4;
    private program: ShaderProgram;
    private vao?: Vao;

    private data?: InnerData;
    private positionBuffer?: Buffer;
    private uvBuffer?: Buffer;
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

        const position = {
            array: new Float32Array(this.vertexCount * verticesPerPoint),
            index: 0,
        };
        const offset = {
            array: new Int16Array(this.vertexCount * 2),
            index: 0,
        };
        const uv = {
            array: new Uint16Array(this.vertexCount * 2),
            index: 0,
        };

        this.data = {
            position,
            offset,
            uv,
        };

        const { gl } = this.renderContext;
        this.positionBuffer = new Buffer(position.array, {
            itemSize: 2,
            dataType: Buffer.Float,
        });
        this.positionBuffer.drawType = Buffer.DynamicDraw;
        this.positionBuffer.prepare(gl);

        this.offsetBuffer = new Buffer(offset.array, {
            itemSize: 2,
            dataType: Buffer.Short,
        });
        this.offsetBuffer.drawType = Buffer.DynamicDraw;
        this.offsetBuffer.prepare(gl);

        this.uvBuffer = new Buffer(uv.array, {
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
        if (!this.data || !this.positionBuffer || !this.offsetBuffer || !this.uvBuffer) {
            return;
        }

        const data = this.data;
        data.position.index = 0;
        data.offset.index = 0;
        data.uv.index = 0;

        const size = [this.max[0] - this.min[0], this.max[1] - this.min[1]];
        mat4.fromTranslationScale(
            this.matrix,
            [this.min[0], this.min[1], 0],
            [size[0], size[1], 1],
        );

        const icons = this.atlas.icons[Math.floor(mapZoom)];
        const [atlasWidth, atlasHeight] = atlasSize;

        this.points.forEach((point) => {
            const icon = icons[point.icon];

            const x = (point.position[0] - this.min[0]) / size[0];
            const y = (point.position[1] - this.min[1]) / size[1];

            storeVertex(data, x, y, -1, -1, 0, 0, icon, atlasWidth, atlasHeight);
            storeVertex(data, x, y, -1, 1, 0, 1, icon, atlasWidth, atlasHeight);
            storeVertex(data, x, y, 1, -1, 1, 0, icon, atlasWidth, atlasHeight);

            storeVertex(data, x, y, 1, 1, 1, 1, icon, atlasWidth, atlasHeight);
            storeVertex(data, x, y, 1, -1, 1, 0, icon, atlasWidth, atlasHeight);
            storeVertex(data, x, y, -1, 1, 0, 1, icon, atlasWidth, atlasHeight);
        });

        const { gl } = this.renderContext;
        this.positionBuffer.subData(gl, 0, data.position.array);
        this.offsetBuffer.subData(gl, 0, data.offset.array);
        this.uvBuffer.subData(gl, 0, data.uv.array);
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

    // index -> zoom, element -> [index -> type, element -> Icon]
    const icons: AtlasIcon[][] = [];
    for (let i = 0; i < 21; i++) {
        icons.push([]);
    }

    sourceIcons.forEach(({ width, height }, index) => {
        const curveWidth: Array<[number, number]> =
            typeof width === 'number' ? [[0, width]] : width;
        const curveHeight: Array<[number, number]> =
            typeof height === 'number' ? [[0, height]] : height;

        let prevIconZoom = -1;
        let prevIcon: AtlasIcon | undefined;

        for (let i = 0; i < curveWidth.length; i++) {
            const zoom = curveWidth[i][0];

            x += margin;
            const w = curveWidth[i][1] * window.devicePixelRatio;
            const h = curveHeight[i][1] * window.devicePixelRatio;
            const icon: AtlasIcon = { x, y, w, h };
            x += margin + w;

            for (let z = prevIconZoom + 1; z <= zoom; z++) {
                icons[z][index] = prevIcon || icon;
            }

            prevIcon = icon;
            prevIconZoom = zoom;
        }

        if (prevIcon) {
            for (let z = prevIconZoom + 1; z <= 20; z++) {
                icons[z][index] = prevIcon;
            }
        }
    });

    const promises = sourceIcons.map((icon) => loadImage(icon.url));

    const imagePromise = Promise.all(promises).then((images) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

        canvas.width = atlasSize[0];
        canvas.height = atlasSize[1];

        images.forEach((img, i) => {
            icons.forEach((zoomIcons) => {
                const icon = zoomIcons[i];
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

function storeVertex(
    data: InnerData,
    positionX: number,
    positionY: number,
    offsetX: number,
    offsetY: number,
    uvX: number,
    uvY: number,
    icon: AtlasIcon,
    atlasWidth: number,
    atlasHeight: number,
) {
    const { position, offset, uv } = data;

    position.array[position.index++] = positionX;
    position.array[position.index++] = positionY;

    offset.array[offset.index++] = (offsetX * icon.w) / 2;
    offset.array[offset.index++] = (offsetY * icon.h) / 2;

    uv.array[uv.index++] = Math.floor(((icon.x + uvX * icon.w) / atlasWidth) * 65535);
    uv.array[uv.index++] = Math.floor(((icon.y + uvY * icon.h) / atlasHeight) * 65535);
}
