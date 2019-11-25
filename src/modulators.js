// MidiController, RecordedController, SoundController
export class Modulator {
  constructor() {
    this.active = false;
    this.startTime = Date.now();
  }
  update() {
    this.time = (Date.now() - this.startTime) / 1000;
  }
}

export class AudioModulator extends Modulator {
  constructor(audio, spectrum, param) {
    super();
    this.audio = audio;
    this.spectrum = spectrum;
    this.param = param;
    this.default = param.default;


    this.lastEffects = [];

    this.gamma = 0.1;
  }

  update = (controller) => {
    const fft = this.audio.getFFT();

    let total = 0;
    for(let key of this.spectrum.keys())
      total += (fft[key] || 0);

    const effect = (total-1200)/300 / 3;

    if(this.lastEffects.push(effect) > 10)
      this.lastEffects.shift();
    const maEffect = this.lastEffects.reduce((a, b) => a + b, 0) / this.lastEffects.length;

    const effectedValue = this.default + maEffect;
    controller.target.setInput(this.param.name, effectedValue);
    //console.log(this.audio.getFFT());
    //controller.changeScalar(effectedValue)
    //
  }
}

export class StepwiseModulator extends Modulator {
  constructor(param, value) {
    super();
    this.param = param;
    this.value = value;
  }

  update = (controller) => {
    super.update();
  }
}

export class InterruptedStepwiseModulator extends StepwiseModulator {
  //wup wup wup
}

//primitives: 
//repeats, single steps
//play 1 param, repeat, single step, repeat another param

//TODO: record sequence
export class MultiTrackedModulator extends Modulator {
  constructor(params, values) {
    super();
    this.params = params;
    this.values = values;
  }
}

export class LinearModulator extends Modulator {
  constructor(param, value) {
    super();
    this.param = param;
    this.value = value;
  }

  set end(end) {
    this.end = end 
  };

  set duration(duration) {
    this.duration = duration;
  }

  restart = () => super.constructor();

  update = (controller) => {
    const newValue = this.value + (time / duration) * (maxValue - this.value);
    controller.target.setInput(this.param.name, newValue);
  }
}

export class SineModulator extends Modulator {
  constructor(param, value) {
    super();
    this.param = param;

    this.min = param.min;
    this.max = param.max;
    this.frequency = 5;

    this.paramMap = [
      {name: "min", min: param.min, max: param.max},
      {name: "max", min: param.min, max: param.max},
      {name: "frequency", min: 1.0, max: 100},
      {name: "frequency", min: 0.01, max: 1.0}
    ];
  }

  setParams = (index, value) => {
    const param = this.paramMap[index];
    this[param.name] = param.min + value * (param.max - param.min);
  }

  update(controller) {
    super.update();
    const newValue = this.min + Math.sin(this.time * this.frequency)
      * (this.max - this.min);
    controller.target.setInput(this.param.name, newValue);
  }
}

export class PolynomialModulator extends Modulator {
  constructor(param) {
    super();
    this.param = param;

    this.min = param.min;
    this.max = param.max;
    this.frequency = 5;
    this.exponent = 2;

    this.paramMap = [
      {name: "min", min: param.min, max: param.max},
      {name: "max", min: param.min, max: param.max},
      {name: "frequency", min: 0.2, max: 100},
      {name: "exponent", min: 0.1, max: 10}
    ];
  }

  setParams = (index, value) => {
    const param = this.paramMap[index];
    this[param.name] = param.min + value * (param.max - param.min);
  }

  update = (controller) => {
    super.update();
    const base = Math.floor(this.time * this.frequency);
    const cycle = base % 2;
    const progress = this.time - base;

    const x = cycle * progress + (1 - cycle) * (1 - progress);
    const newValue = this.min + (x ** this.exponent) * (this.max - this.min);
    controller.target.setInput(this.param.name, newValue);
  }
}
