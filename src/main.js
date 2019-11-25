//import { Rave, Sound, Controller } from "./rave.js";

import { Renderable, Pipeline } from "./renderable.js";
import { ImageAdapter, ISFAdapter, Postprocessor } from "./adapter.js";
import { loadImage } from "./tools.js";
import { Controller } from "./controller.js";
import { MidiInput } from "./input.js";
import { Audio } from "./audio.js";
import { Modulator, AudioModulator } from "./modulators.js";

import { getRegl } from "./graphics.js";
const regl = getRegl();

/*
var controller = new Controller("AKAI");
var sound = new Sound("audio/mbp.mp3");
controller.setSound(sound);
var rave = new Rave(controller);
rave.start();

sound.audio.play();
*/


export class Rave {
  constructor(name) {
    this.name = name;
    this.variators = [];
    this.loaded = false;
    this.load();
  }

  async load() {
    //TODO: load definition file
    if(this.name === "fractal")
    {
      this.renderable = new Renderable(
        new ISFAdapter("https://www.interactiveshaderformat.com/sketches/1415")
      );
      this.renderable.setUp();
    }
    else if(this.name === "picture")
    {
      this.renderable = new Renderable(
        //new ImageAdapter("http://www.lob.lv/images/akcijas/liela_zilite_small.jpg")
        new ImageAdapter("https://is3-ssl.mzstatic.com/image/thumb/Purple124/v4/c7/21/4b/c7214b9b-efcd-9838-18c9-4fece9831451/source/256x256bb.jpg")
      );
      this.renderable.setUp();
    }
    else if(this.name === "input")
    {
      const image = await loadImage("https://is3-ssl.mzstatic.com/image/thumb/Purple124/v4/c7/21/4b/c7214b9b-efcd-9838-18c9-4fece9831451/source/256x256bb.jpg");
      const texture = regl.texture(image);

      this.renderable = new Renderable(
        new ISFAdapter("https://www.interactiveshaderformat.com/sketches/3521"),
        { inputImage: texture }
      );
      this.renderable.setUp();
    }
    else if(this.name === "pipeline")
    {
      /*
      const image = await loadImage("https://is3-ssl.mzstatic.com/image/thumb/Purple124/v4/c7/21/4b/c7214b9b-efcd-9838-18c9-4fece9831451/source/256x256bb.jpg");
      const texture = regl.texture(image);
      */
      this.renderable = new Pipeline([
       // new Renderable(new ISFAdapter("https://www.interactiveshaderformat.com/sketches/1415")),
        /*
        new Renderable(
          new ISFAdapter("https://www.interactiveshaderformat.com/sketches/3521"),
          { inputImage: texture },
          "image"
        ),*/
        new Renderable(new ISFAdapter("https://www.interactiveshaderformat.com/sketches/129")),
        new Renderable(
          new ISFAdapter("https://www.interactiveshaderformat.com/sketches/3521"),
          { inputImage: 0 },
          "circulator"
        ),
        new Renderable(
          new ISFAdapter("https://www.interactiveshaderformat.com/sketches/3538"),
          //new ISFAdapter("https://www.interactiveshaderformat.com/sketches/3521"),
          { inputImage: 1 },
          "3538"
        ),
        new Renderable(new Postprocessor(), { texture: 2 }, "pp")
      ]);

      await this.renderable.setUp();
      this.renderable.renderables[1].setInput("numberOfDivisions", 2);
    }

    this.controller = new Controller(this.renderable);
    const akaiMIDI = new MidiInput("AKAI");
    await akaiMIDI.init();
    this.controller.attachInputDevice(akaiMIDI);

    const audio = new Audio();
    navigator.mediaDevices.getUserMedia({audio: true})
      .then(audio.fromStream)
      .catch((err) => {console.log("#########", err.message);});
    //this.controller.addModulator(new AudioModulator(audio));
    this.controller.addAudio(audio);
    console.log("controller", this.controller);
    this.loaded = true;
  }

  render = () => {
    if(this.loaded)
    {
      this.controller.update();
      this.renderable.render();
    }
  }
}


export class Main
{
  constructor(controller) {
    this.rave = new Rave("pipeline");
  }


  begin = () => {
    regl.frame(this.render);
  }

  render = (props) => {
    regl.clear({
      color: [0, 0, 0, 0],
      depth: 1
    });
    try {
      this.rave.render();
    }
    catch(e) {
      console.log("Error", e);
      regl.destroy()
      throw new Error("Stop debil");
    }
  }
}

window.main = new Main();
window.main.begin();