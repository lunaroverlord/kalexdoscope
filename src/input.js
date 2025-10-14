import AbletonPush from '@garrensmith/abletonpush/src'
import { buttonColors } from '@garrensmith/abletonpush/src';


class InputDevice {
  init = () => {};
  bind = (callbacks) => {};
  groupWithKey(groups, note) {
    for(const [i, group] of this.groups.entries())
      if(group.includes(note))
        return [i, group.indexOf(note)];
    return [-1, -1];
  }
}

export class MidiInput extends InputDevice {
  constructor(manufacturer) {
    super();
    this.manufacturer = manufacturer;
  }

  init = async () => {
    return new Promise((resolve, reject) => {
      WebMidi.enable((err) => {
        if (err)  {
          console.error(err)
          reject("WebMidi error", err);
        } else {
          console.log(WebMidi.inputs);
          console.log(WebMidi.outputs);
          const input = WebMidi.inputs.find(input => input.manufacturer == this.manufacturer);

          if(!input)
            throw new Error("MIDI controller not found");

          console.log("midi input", input);
          resolve(input);
        }
      }, false);
    })
    .then(input => {
      this.input = input;
      return input
    });
  };

  /*
   * Akai input map
   *
   *    B C D ?
   * 2: E F G A
   * 3: C D E F G A B | 4: C D E F G A B
   *
   */
  groups = [
    [36, 37, 38, 39,
     40, 41, 42, 43],
    [28, 29, 30, 31,
     32, 33, 34, 35],
    [48, 50, 52, 53, 55, 57, 59, 60,  62, 64, 65, 67, 69, 71, 72],
    [49, 51, 54, 56, 58, 61, 63, 66, 68, 70]
  ];

  bind = callbacks => {
    const { changeScalar, changeState, changeMode } = callbacks;
    const { input } = this;

    input.addListener('noteon', "all", e => {
        //e.velocity
        const [index, key] = super.groupWithKey(this.groups, e.note.number);
        changeState(index, key, true);
      }
    );

    input.addListener('noteoff', "all", e => {
        const [index, key] = super.groupWithKey(this.groups, e.note.number);
        changeState(index, key, false);
        //this.toggleNote(e.note.name, e.note.octave, false);
      }
    );

    input.addListener('controlchange', "all", e => {
        //console.log("Control change", e.data);

        //AKAI specific remapping
        let controlIndex = Math.max(e.data[1] - 1, 0);
        if(e.data[1] == 0)
          controlIndex = 1;

        const controlValue = e.data[2] / 127;
        changeScalar(controlIndex, controlValue);
      }
    );
  };
}

export class PushMidiInput extends InputDevice {
  constructor() {
    super();
    this.manufacturer = "Ableton AG"
    // this.midiInput = new MidiInput(this.manufacturer);
  }

  init = async () => {
    // return this.midiInput.init().then(() => {
    //   console.log("inited mini")
    // })
    // .then(input => {
    //   this.rawInput = input
    //   this.abletonInput = new AbletonPush({ logging: true});
    // });
    this.abletonInput = new AbletonPush({ logging: false});
    this.abletonInput.setColourButtons(102, buttonColors.red);
  }

  groups = [
    [36, 37, 38, 39,
     40, 41, 42, 43],
    [28, 29, 30, 31,
     32, 33, 34, 35],
    [48, 50, 52, 53, 55, 57, 59, 60,  62, 64, 65, 67, 69, 71, 72],
    [49, 51, 54, 56, 58, 61, 63, 66, 68, 70]
  ];

  bind = callbacks => {
    const { getScalar, changeScalar, changeState, changeMode } = callbacks;

    this.abletonInput.on('note:on', ({ event: e }) => {
      const [index, key] = super.groupWithKey(this.groups, e.note.number);
      changeState(index, key, true);
    });

    this.abletonInput.on('note:off', ({ event: e }) => {
      const [index, key] = super.groupWithKey(this.groups, e.note.number);
      changeState(index, key, false);
    });

    this.abletonInput.on('push:encoder', e => {
      let controlIndex, newControlValue;
      const encoderIndex = e.number;
      if (encoderIndex  >= 71 && encoderIndex <= 78) {
        // 8 Rotary encoders above screen => set value of param
        controlIndex = encoderIndex - 71;
        const [currentControlValue, paramSpec] = getScalar(controlIndex)
        const controlValueDiff = e.movement.direction == "right" ? e.movement.amount : -e.movement.amount;
        newControlValue = (currentControlValue / paramSpec.max) * 127 + controlValueDiff;
        // console.log("current", currentControlValue, "diff", controlValueDiff, "new", newControlValue)
        if(newControlValue < 0) {
          newControlValue = 0;
        } else if(newControlValue > 127) {
          newControlValue = 127;
        }
      } else if (encoderIndex >= 102 && encoderIndex <= 109 && e.movement.direction == "right") {
        // 8 buttons above screen being released => reset param value to default
        controlIndex = encoderIndex - 102;
        const [currentControlValue, paramSpec] = getScalar(controlIndex)
        newControlValue = (paramSpec.default / paramSpec.max) * 127;
        console.log("reset to", newControlValue)
      } else {
        console.log("this encoder is noop, index =", encoderIndex)
        return;
      }

      if (newControlValue !== undefined) {
        changeScalar(controlIndex, newControlValue / 127);
      } else {
        console.log("noop: newControlValue not set")
      }
    });
    
    // input.addListener('controlchange', "all", e => {
    //     //console.log("Control change", e.data);
      
    //     //AKAI specific remapping
    //     let controlIndex = Math.max(e.data[1] - 1, 0);
    //     if(e.data[1] == 0)
    //       controlIndex = 1;

    //     const controlValue = e.data[2] / 127;
    //     changeScalar(controlIndex, controlValue);
    //   }
    // );
  }
}