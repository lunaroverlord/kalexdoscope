/*
import BABYLON from "babylonjs";
import { Gen, realms, renderer } from "./runtime.js";
import { Contour } from "./contour.js";
import { PLANE, GROUND } from "./shapes.js";
import { Vector3 } from "babylonjs";
*/

import ISF from "interactive-shader-format";

const noteOrder = ["C3", "D3", "E3", "F3", "G3", "A3", "B3",
                   "C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];

const extractShader = html => {
  const shaderObject = html.match(new RegExp("data-sketch=\'(.*)\'\>\<\/div\>"))[1];
  const shader = JSON.parse(shaderObject)["raw_fragment_source"];
  return shader;
}

const addEffects = shader => {
  const cycleInput = `
    {
            "NAME": "_cycle",
            "TYPE": "float",
            "DEFAULT": 0.5,
            "MIN": 0.0,
            "MAX": 1.0
    },
    {
            "NAME": "_hue",
            "TYPE": "float",
            "DEFAULT": 0.0,
            "MIN": 0.0,
            "MAX": 1.0
    },
  `;

  const functions = `
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
  `;

  const fragmentPostprocess = `
    vec3 pp = rgb2hsv(gl_FragColor.rgb);
    if(pp.b > 0.76)
            pp.g *= (2.0*_cycle);
    if(_hue > 0.0)
            pp.r *= _hue;
    gl_FragColor = vec4(hsv2rgb(pp), 1.0);
  `;

  const inputsMarker = "\"INPUTS\": [";
  const inputsPoint = shader.indexOf(inputsMarker) + inputsMarker.length;
  const mainStartPoint = shader.indexOf("void main");
  const mainEndPoint = shader.lastIndexOf("}");

  const newShader =
    shader.slice(0, inputsPoint) +
    cycleInput +
    shader.slice(inputsPoint, mainStartPoint) +
    functions + 
    shader.slice(mainStartPoint, mainEndPoint) + 
    fragmentPostprocess +
    "}";
  return newShader;
}

class Rave
{
  constructor(controller) {
    this.canvas = document.querySelector('#container');
    this.canvas.width=1000;
    this.canvas.height=1000;
    this.gl = this.canvas.getContext("webgl");
    this.renderer = new ISF.Renderer(this.gl);

    this.cycle = 0;
    this.time = 0;
    this.cyclerSpeed = 0.1;
    this.cyclerPhase = 0.9;

    this.inputs = {};
    this.controller = controller;
    controller.target = this;
  }

  start = () => this.pullShader()

  pullShader = (sketchSource="https://www.interactiveshaderformat.com/sketches/1415") => {
    //const sketchSource = "https://www.interactiveshaderformat.com/sketches/1415";
    //const sketchSource = "shaders/tapestry.fs";
    fetch(sketchSource)
    .then(response => response.text())
    .then(extractShader)
    .then(addEffects)
    .then(shader => {
      this.renderer.loadSource(shader);
      //renderer.setValue("", someValue);
      console.log("shader", shader);
      this.controller.mapShaderInputs(this.renderer.model.inputs);

      console.log("shader loaded");

      this.renderer.draw(this.canvas);

      console.log("renderer", this.renderer);
      clearInterval(this.renderInterval);
      this.begin();
    });

  }

  setValue = (key, value) => {
    if(this.hasOwnProperty(key)) //[0, 1]
      this[key] = value;
    else
      this.renderer.setValue(key, value);
    console.log(key, " = ", value);
  }

  begin= () => { this.renderInterval = setInterval(this.render, 10) };

  render = () => {
    this.time++;

    this.controller.update();

    this.cycle = this.cyclerSpeed * 1.5 * ((Math.sin(this.cyclerPhase * this.time)) + 1.0) / 2.0;
    this.renderer.setValue("_cycle", this.cycle);
    this.renderer.draw(this.canvas);
  }
}

class Sound
{
  constructor(sourceFile) {
    var audio = new Audio();
    audio.src = sourceFile;
    audio.controls = true;
    audio.autoplay = false;
    document.getElementById('audio').appendChild(audio);

    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = audioCtx.createAnalyser();
    var source = audioCtx.createMediaElementSource(audio);
    source.connect(this.analyser);
    source.connect(audioCtx.destination);
 
    this.analyser.fftSize = 32;

    this.output = new Uint8Array(this.analyser.frequencyBinCount)

    this.audio = audio;
  }

  getFFT = () => {
    this.analyser.getByteFrequencyData(this.output);
    return this.output;

    /* TimeDomain
    this.analyser.getByteTimeDomainData(this.output)
    const sum = this.output.reduce((a, b) => a + b, 0);
    const max = this.output.reduce((a, b) => b > a ? b : a, 0);
    const len = (sum / 50) - (1000 / 50)
    console.log("|".repeat(max/4));
    */
    //console.log(max, this.output);
  }
}

class Controller
{
  constructor(manufacturer) {
    this.shaderInputs = [];
    this.state = new Set();
    this.lastValues = {};

    this.soundBoundInput = null;
    this.soundSpectrum = new Set();

    console.log("enabling  web midi");
    WebMidi.enable((err) => {

      if (err) 
        console.log("WebMidi could not be enabled.", err);
      else {
        console.log("WebMidi enabled!");
        console.log(WebMidi.inputs);
        console.log(WebMidi.outputs);
        var input = WebMidi.inputs.find(input => input.manufacturer == manufacturer);

        // Listen for a 'note on' message on all channels
        input.addListener('noteon', "all",
          (e) => {
            console.log("Received 'noteon' message (" + e.note.name + e.note.octave + ").");
            this.toggleNote(e.note.name, e.note.octave, true);
          }
        );


        // Listen for a 'note on' message on all channels
        input.addListener('noteoff', "all",
          (e) => {
            console.log("Received noteoff' message (" + e.note.name + e.note.octave + ").");
            this.toggleNote(e.note.name, e.note.octave, false);
          }
        );

        // Listen to pitch bend message on channel 3
        input.addListener('pitchbend', 3,
          (e) => {
            console.log("Received 'pitchbend' message.", e);
          }
        );

      // Listen to control change message on all channels
      input.addListener('controlchange', "all",
        (e) => {
          this.changeScalar(e.data[1], e.data[2] / 127);
        }
      );
      }
      
    }, false);
  }

  update = () => {
    this.processSound();
  }

  processSound = () => {
    if(this.soundBoundInput)
    {
      const fft = this.sound.getFFT();
      console.log("fft size", fft.length);
      let total = 0;
      for(let key of this.soundSpectrum.keys())
        total += (fft[key] || 0);

      const effect = (total-1200)/300 / 3;
      //console.log("processing sound form keys ", this.soundSpectrum.keys(), " = ", effect);
      const effectedValue = this.lastValues[this.soundBoundInput] + effect;
      this.target.setValue(this.soundBoundInput, effectedValue);
    }
  }

  setTarget = target => this.target = target;

  setSound = sound => this.sound = sound;

  toggleNote = (name, octave, state) => {
    const setOp = state ? "add" : "delete";
    const opMap = {
      "3*": false,
      "4B": "effects",
      "4A": "frequencies"
    }

    if(this.state.has("frequencies"))
    {
      const band = noteOrder.indexOf(`${name}${octave}`); 
      console.log("lookingup band", `${name}${octave}`);
      this.soundSpectrum[setOp](band);
      console.log(this.soundSpectrum);

      if(octave > 2)
        return;
    }

    switch(octave) {
      case 2:
        switch(name) {
          case 'E':
            this.state[setOp]("effects");
          break;
          case 'F':
            this.state[setOp]("frequencies");
          break;
          case 'G':
            this.state[setOp]("change");
          break;
        }
      break;
      case 3:
        if(this.state.has("change"))
        {
          const index = "CDEFGAB".indexOf(name);
          const shaders = [
            "https://www.interactiveshaderformat.com/sketches/1415",
            "https://www.interactiveshaderformat.com/sketches/2154",
            "https://www.interactiveshaderformat.com/sketches/2836",
            "https://www.interactiveshaderformat.com/sketches/1826",
            "https://www.interactiveshaderformat.com/sketches/1833",
            "https://www.interactiveshaderformat.com/sketches/1630",
            "https://www.interactiveshaderformat.com/sketches/1883",
            "https://www.interactiveshaderformat.com/sketches/2150"
          ];
          console.log("pullin ", shaders[index]);
          this.target.pullShader(shaders[index]);
        }
      break;
    }

  }

  //TODO: bind multiple fft modulators
  changeScalar = (controlIndex, controlValue) => {

    const aInput = this.activatedInput(controlIndex);
    if(!aInput)
      return;
    if(this.state.has("frequencies"))
    {
      this.soundBoundInput = aInput;
      //this.bindFrequencies(controlIndex, controlValue);
    }
    else if(this.state.has("effects"))
    {
      this.lastValues[aInput] = controlValue;
      this.target.setValue(aInput, controlValue);
    }
    else {
      let value = controlValue;
      //constrain?
      const control = this.shaderInputs.find(si => si.NAME == aInput);
      if(control)
        value = control.MIN + (controlValue * (control.MAX - control.MIN));

      this.lastValues[aInput] = value;
      this.target.setValue(aInput, value);
    }
  }

  activatedInput = (controlIndex) => {
    let changeVar;
    const normIndex = controlIndex - 1;
    console.log("ci", normIndex);
    if(this.state.has("effects"))
      changeVar = ["cyclerSpeed", "cyclerPhase", "_hue"][normIndex];
    else
      if(normIndex >= this.shaderInputs.length)
        return;
      else
        changeVar = this.shaderInputs[normIndex].NAME;

    return changeVar;
  }

  changeEffects = (controlIndex, controlValue) => {
    const changeVar = ["cyclerSpeed", "cyclerPhase", "_hue"][controlIndex];
  }

  mapShaderInputs = (shaderInputs) => {
    console.log("shaderInputs", shaderInputs);
    this.shaderInputs = shaderInputs.filter(si => si.NAME[0] != "_" && si.TYPE == "float");
  }
}

var controller = new Controller("AKAI");
var sound = new Sound("audio/mbp.mp3");
controller.setSound(sound);

var rave = new Rave(controller);
rave.start();

sound.audio.play();

/* Hingine integration
class Rave
{
  constructor(scene) {
    this.scene = scene;

    console.log("making rave");
    fetch("shaders/tapestry.fs")
    .then(shader => shader.text())
    .then(shader => {
      console.log("ISF", ISF)
      const parser = new ISF.Parser();
      parser.parse(shader);
      console.log("parsed vshader, ", parser.vertexShader);
      console.log("parsed fshader, ", parser.fragmentShader);
      console.log("parsed inputs, ", parser.inputs);
      BABYLON.Effect.ShadersStore["textPixelShader"] = parser.fragmentShader;
      BABYLON.Effect.ShadersStore["textVertexShader"] = parser.vertexShader;

      const vertex = parser.vertexShader;
      const fragment = parser.fragmentShader;

      this.material = new BABYLON.ShaderMaterial("rave", scene, { vertex: "text", fragment: "text" },
        {
          attributes: ["position", "normal", "uv"],
          uniforms: ["h", "j", "worldViewProjection", "projection"]
        }
      );
      console.log("material", this.material);

    });
  }

  getMaterial = () => {
    return this.material;
  }
}

const raveController = new Rave(renderer.scene);

let rave = {
  contour: new Contour(PLANE, new Vector3(0, 0, 1)),
  texture: "manta.jpg",
  cycler: raveController,
  distance: 20,
  steps: 1,
  mass: 0,
  tag: "rave"
}
rave = new Gen(rave);
rave.generate();
rave.getDisjoint();

/*
window.addEventListener('keydown', function(event) {
  console.log("key", event.keyCode);
  keyState[event.keyCode] = true;
}, false);

window.addEventListener('keyup', function(event) {
  keyState[event.keyCode] = false;
}, false);
*/

