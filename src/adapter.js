import ISF from "interactive-shader-format";
import { loadImage } from "./tools.js";

import { getRegl } from "./graphics.js";
const regl = getRegl();

export class Source
{
  getParams = (inputs) => {}
  getParamSpec = () => {}
  getShaders = () => {}
  hooks = { 
    updateInput: () => {},
    inputMap: () => {}
  }
}

export class ImageAdapter extends Source
{
  constructor(imageSource) {
    super();
    this.imageSource = imageSource;
  }

  async parse() {
    this.image = await loadImage(this.imageSource);
    this.imageTexture = regl.texture(this.image);
  }

  getShaders = () => ({
    frag: `
    precision mediump float;
    varying vec2 uv;
    uniform sampler2D image;

    void main() {
        gl_FragColor = texture2D(image, uv);
    } `,
    vert:`
    precision mediump float;
    varying vec2 uv;
    attribute vec2 position;
    void main() {
      uv = position;
      gl_Position = vec4(1.0 - 2.0 * position, 0, 1);
    }`
  });

  getParams = (inputs) => ({
    image: this.imageTexture
  })

  getParamSpec = () => ([{ name: "image", type: "image" }]);
}

export class ISFAdapter extends Source
{
  constructor(sketchSource) {
    super();
    this.sketchSource = sketchSource;
    this.parser = new ISF.Parser();
    this.inputExtras = {};
  }

  extractShader = html => {
    const shaderObject = html.match(new RegExp("data-sketch=\'(.*)\'\>\<\/div\>"))[1];
    const shader = JSON.parse(shaderObject)["raw_fragment_source"];
    return shader;
  }

  async parse() {
    const html = await (await fetch(this.sketchSource)).text();
    const shader = this.extractShader(html);
    this.parser.parse(shader);
    this.fragmentShader = this.parser.fragmentShader;
    this.vertexShader = this.parser.vertexShader;
    this.paramSpec = this.parser.inputs.map(this.parseInput);
  }

  parseInput(isfObject) {
    return Object.keys(isfObject).reduce((newInput, key) => {
        newInput[key.toLowerCase()] = isfObject[key];
        return newInput;
    }, {});
  }

  getShaders = () => ({
    frag: this.fragmentShader,
    vert: this.vertexShader
  })

  hooks = {
    inputMap: (inputMap) => {
      for(const param of this.paramSpec) {
        if(param.type === "image")
        {
          this.processTextureInput(param.name, inputMap[param.name]());
          inputMap["_" + param.name + "_imgSize"] = () => [
            this.inputExtras[param.name].width,
            this.inputExtras[param.name].height
          ],
          inputMap["_" + param.name + "_imgRect"] = () => [0, 0, 1, 1];
          inputMap["_" + param.name + "_flip"] = () => false;
        }
      }
    },

    updateInput: (name, newInput) => {
      const param = this.paramSpec.find(ps => ps.name === name);
      if(param.type === "image")
        this.processTextureInput(name, newInput);
    }
  }

  processTextureInput = (name, textureInput) => {
    const { width=0, height=0 } = textureInput;
    this.inputExtras[name] = { width, height };
  }

  getParamSpec = () => this.paramSpec;

  hasTextureInput = () => {
    return this.inputs.some(i => i.type === "image");
  }

}

export class Postprocessor extends Source
{
  async parse () {}

  getShaders = () => ({
    frag: `
precision mediump float;
uniform float hue;
uniform float cycle;

uniform sampler2D texture;

varying vec2 uv;

vec3 Gamma(vec3 value, float param)
{
    return vec3(pow(abs(value.r), param),pow(abs(value.g), param),pow(abs(value.b), param));
}

vec3 brightnessContrast(vec3 value, float brightness, float contrast)
{
    return (value - 0.5) * contrast + 0.5 + brightness;
}

vec3 rgb2hsv(vec3 c)
{
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main()
{
    vec3 color = texture2D(texture, uv).rgb;
    vec3 pp = rgb2hsv(color);
    if(pp.b > 0.76)
            pp.g *= (2.0*cycle);
    if(hue > 0.0)
            pp.r *= hue;
    gl_FragColor = vec4(hsv2rgb(pp), 1.0);
}
    `,
    vert:`
    precision mediump float;
    varying vec2 uv;
    attribute vec2 position;
    void main() {
      uv = position;
      gl_Position = vec4(1.0 - 2.0 * position, 0, 1);
    }`
  });

  getParams = (inputs) => ({
  })

  getParamSpec = () => ([
    { name: "texture", type: "image" },
    { name: "cycle", type: "float", min: 0, max: 1, default: 0.5 },
    { name: "hue", type: "float", min: 0, max: 1, default: 0.5 }
  ]);
}

