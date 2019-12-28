import { Source, ISFAdapter } from "./adapter.js";

import { getRegl } from "./graphics.js";
const regl = getRegl();

export class Variator {
  constructor() {
    this.start = null;
    this.duration = null;
    this.stride = 0;
    this.param = null;
  }
  apply = (time) => {
  }
}

export class Renderable {
  constructor(source, inputs, name="") {
    this.name = name;
    this.source = source;
    this.inputs = inputs || {};
    this.loaded = false;
  }

  setFramebuffer(fbo) {
    this.fbo = fbo;
  }

  async setUp() {
    await this.source.parse();
    this.spec = this.source.getParamSpec();
    /*
    if(this.source.hasTextureInput())
      throw new Error("Shader requires a texture input");
      */
    const reglDef = {
      ...this.source.getShaders(),
      attributes: {
        position: [
          [-1, -1],
          [-1, 1],
          [1, 1],
          [1, 1],
          [1, -1],
          [-1, -1]
        ]
      },
      count: 6,
      uniforms: {
        RENDERSIZE: (context) => [context["viewportWidth"], context["viewportHeight"]],
        TIME: regl.context("time"),
        ...this.getParams(this.inputs),
      },
      framebuffer: this.fbo
    };
    //console.log("reglDef", reglDef);

    this.target = regl(reglDef);
    this.loaded = true;
  }

  getSpec = () => this.spec;

  getParams = () => {
    let inputMap = {};
    //console.log("inputMap before", inputMap);
    this.spec.map(param => {
      if(!(param.name in this.inputs))
        this.inputs[param.name] = param.type === "bool" ? Boolean(param.default) : param.default;
      inputMap[param.name] = () => this.inputs[param.name];
    });
    //console.log("inputs ", this.inputs);
    //console.log("inputMap after", inputMap);
    if(this.source.hooks.inputMap)
      this.source.hooks.inputMap(inputMap);
    this.inputMap = inputMap;
    return inputMap;
  }

  render = () => {
    if(this.loaded)
      this.target();
  }

  getTextureParams = () => {
    return this.source.getParamSpec().filter(param => param.type === "image");
  }

  setInput = (name, value) => {
    this.inputs[name] = value;
    this.source.hooks.updateInput(name, value);
    return this;
  }

  getInput = (name) => {
    return [this.inputs[name], this.spec.find(param => param.name == name)];
  }
}

export class Pipeline extends Renderable
{
  constructor(renderables) {
    super();
    this.renderables = renderables;
    this.framebuffers = Array.from(Array(renderables.length - 1), () => 
      regl.framebuffer({
        color: [ regl.texture({width: 1024, height: 1024}) ],
        depth: false,
        stencil: false
      })
    );
    this.loaded = false;
  }

  async setUp() {
    //TODO: full pipeline texture passing
    for(const [i, r] of this.renderables.entries()) {
      if(i !== this.renderables.length - 1) // not last
        r.setFramebuffer(this.framebuffers[i]);

      await r.setUp();

      if(i !== 0) // not first
        r.getTextureParams().forEach(tp =>
          r.setInput(tp.name, this.framebuffers[i-1].color[0])
        )
    }
    this.loaded = true;
  }

  getSpec = () => {
    let spec = [], stage = 0;
    for(const renderable of this.renderables)
    {
      let addSpec = renderable.getSpec().map(param => 
        ({...param, name: `${renderable.name}:${param.name}`, stage })
      );
      spec = spec.concat(addSpec);
      stage++;
    }
    return spec;
  }

  linkStages = (renderable) => {
    const spec = renderable.source.getParamSpec();
    if(!spec)
    {
      console.log("pass", spec);
      return;
    }
    const inputs = renderable.inputs;
    if(inputs)
      for(const [key, value] of Object.entries(inputs)) {
        console.log("checking key ", key)
        console.log("in spec ", renderable.source.getParamSpec())
        if(spec[key].type === "image" && value instanceof Number)
          console.log(`Found link: ${key}: ${value}`);
      }
  }

  render = () => {
    //texture: fbo.color[0],
    if(this.loaded)
      for(let r of this.renderables) {
        //this.linkStages(r);
        r.render();
      }
  }

  setInput = (name, value) => {
    const [stageName, paramName] = name.split(":");
    return this.renderables.find(r => r.name === stageName).setInput(paramName, value);
  }

  getInput = (name) => {
    const [stageName, paramName] = name.split(":");
    return this.renderables.find(r => r.name === stageName).getInput(paramName);
  }
}
