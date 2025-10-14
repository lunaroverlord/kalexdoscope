import { Modulator, AudioModulator, SineModulator, PolynomialModulator } from "./modulators.js";

export class Controller
{

  fsm = {
    actions: { getScalar: "getScalar", changeScalar: "changeScalar", toggleKey: "toggleKey" },
    states: ["init", "setupModulator"],
    state: "init",

    modulators: new Array(10),
    modulatorIndex: 0,
    modulator: null,
    set modulator (m) { this.modulators[this.modulatorIndex] = m; },
    get modulator () { return this.modulators[this.modulatorIndex]; },
    stage: undefined,
    spectrum: new Array(14),
    spectrumBase: 0,
    spectrumMax: 13,

    call: (action, ...args) => {
      const { fsm, fsm: { actions } } = this;

      console.log(`fsm: ${action} ${args}`);

      switch(action) {
        case actions.getScalar:
          const [controllerIndex] = args;
          if(fsm.state === "setupModulator")
          {
            //noop
            console.log("getScalar noop due to fsm.state")
          }
          else 
          {
            const control = this.scalarParams.filter(
              p => p.stage === fsm.stage)[controllerIndex];
            fsm.lastParam = control;
            return this.target.getInput(control.name);
          }
        break;

        case actions.changeScalar:
          const [controlIndex, controlValue] = args;
          if(fsm.state === "setupModulator")
          {
            fsm.modulator.setParams(controlIndex, controlValue);
          }
          else 
          {
            const control = this.scalarParams.filter(
              p => p.stage === fsm.stage)[controlIndex];
            const value = control.min + (controlValue * (control.max - control.min));
            console.log(control.name, " = ", value);
            fsm.lastParam = control;
            this.target.setInput(control.name, value);
          }
        break;

        case actions.toggleKey:
          const [group, key, state] = args;

          switch(group) {
            case 0:
              fsm.stage = key;
              break;
            case 3:
              fsm.modulatorIndex = key;
              fsm.state = state ? "setupModulator" : "init";
              break;
            case 2:
              if(fsm.state === "setSpectrum" && key >= fsm.spectrumBase && key <= fsm.spectrumMax)
                fsm.setAudioSpectrum(key, state);
              else if(["setupModulator", "setSpectrum"].includes(fsm.state) && key === fsm.spectrumMax + 1)
                fsm.initAudioModulator(key, state);
              else  
                fsm.setModulators(key, state);
              break;
          }
      }
      //log action
    },

    initAudioModulator: (key, state) => {
      const { fsm } = this;
      if(this.audio)
      {
        fsm.state = "setSpectrum";
        if(!state)
        {
          const am = new AudioModulator(this.audio, fsm.spectrum, fsm.lastParam);
          console.log("creating am", fsm.spectrum, fsm.lastParam);
          fsm.modulator = am;
          fsm.state = "init";
        }
      }
    },

    setAudioSpectrum: (key, state) => {
        this.fsm.spectrum[key - this.fsm.spectrumBase] = state;
    },

    setModulators: (key, state) => {
      const { fsm } = this;
      if(fsm.state === "setupModulator")
      {
        if(state && key === 0) {
          fsm.state = "setupModulator";
          fsm.modulator = new SineModulator(fsm.lastParam);
        }
        else if(state && key === 1) {
          fsm.state = "setupModulator";
          fsm.modulator = new PolynomialModulator(fsm.lastParam);
        }
      }
    },

    setStageSource: (key, state) => {
    }
  }

  constructor(renderable) {
    this.target = renderable;
    this.spec = renderable.getSpec();
    this.scalarParams = this.mapParams();
  }

  update = () => {
    this.fsm.modulators.forEach(m => m.update(this));
  }

  addAudio = (audio) => this.audio = audio;

  mapParams = () => {
    //console.log("spec ***** ", this.spec);
    let scalarParams = [];
    if(this.spec)
      this.spec.forEach(param => {
        if(param.type === "float") {
          //scalarParams[param.stage] = scalarParams[param.stage] || [];
          //scalarParams[param.stage].push(param);
          scalarParams.push(param);
        }
      });
    return scalarParams;
  }

  attachInputDevice = (inputDevice) => {
    inputDevice.bind({
      getScalar: this.getScalar,
      changeScalar: this.changeScalar,
      changeMode: this.changeMode,
      changeState: this.changeState
    });
  }

  getScalar = (controlIndex) => {
    return this.fsm.call(this.fsm.actions.getScalar, controlIndex);
  }

  changeScalar = (controlIndex, controlValue) => {
    this.fsm.call(this.fsm.actions.changeScalar, controlIndex, controlValue);
  }

  changeState = (controlGroup, key, state) => {
    this.fsm.call(this.fsm.actions.toggleKey, controlGroup, key, state);
  } 

}
