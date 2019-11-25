class InputDevice {
  init = () => {};
  bind = (callbacks) => {};
}

export class MidiInput extends InputDevice {
  constructor(manufacturer) {
    super();
    this.manufacturer = manufacturer;
  }

  init = async () => {
    return new Promise((resolve, reject) => {
      WebMidi.enable((err) => {
        if (err) 
          reject("WebMidi error", err);
        else {
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

  groupWithKey = (note) => {
    for(const [i, group] of this.groups.entries())
      if(group.includes(note))
        return [i, group.indexOf(note)];
    return null;
  }

  bind = callbacks => {
    const { changeScalar, changeState, changeMode } = callbacks;
    const { input } = this;

    input.addListener('noteon', "all", e => {
        //e.velocity
        const [index, key] = this.groupWithKey(e.note.number);
        changeState(index, key, true);
      }
    );

    input.addListener('noteoff', "all", e => {
        const [index, key] = this.groupWithKey(e.note.number);
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

