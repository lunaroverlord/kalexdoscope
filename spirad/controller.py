from graphics import *
from input import MIDIInput

from spirad import Spirad, Gear, Return, OutputT
from functools import partial, partialmethod
from collections import defaultdict
import operator
import math
import copy

class Control:
    def __init__(self, name, value, calc=lambda value: value):
        self.name = name
        self._value = value
        self.calc = calc
        self.offset = 0

    @property
    def expr(self):
        return self.name

    def __repr__(self):
        return f"{self}={float(self):.4f}"

    def _apply(self, op, symbol, other):
        if isinstance(other, Control):
            result = Control(f"({self.expr} {symbol} {other.expr})", self.value,
                             lambda value: op(value, other.value))
        else:
            result = Control(f"({self.expr} {symbol} {other})", self.value,
                             lambda value: op(value, other))
        return result

    __add__ = partialmethod(_apply, operator.add, '+')
    __radd__ = partialmethod(_apply, operator.add, '+')
    __sub__ = partialmethod(_apply, operator.sub, '-')
    __rsub__ = partialmethod(_apply, operator.sub, '-')
    __mul__ = partialmethod(_apply, operator.mul, '*')
    __rmul__ = partialmethod(_apply, operator.mul, '*')
    __truediv__ = partialmethod(_apply, operator.truediv, '/')
    __rtruediv__ = partialmethod(_apply, operator.truediv, '/')

    @property
    def value(self):
        return self.calc(self._value) + self.offset

    def __float__(self):
        return self.value

    def __int__(self):
        return int(self.value)

    def __str__(self):
        return self.expr


class Modulator(Control):
    def __init__(self, name, value, amp, freq):
        super().__init__(name, value)
        self.amp = amp
        self.freq = freq
        self.seq = {}

    def update(self, time):
        amp = 1.0
        if len(self.seq) > 1:
            seq = list(map(lambda x: x - self.seq[0], self.seq))
            pos = time % (seq[-1] - seq[0])
            if pos not in seq:
                amp = 0.0
        t = (time * 2 * 3.14) / 10
        self._value = amp * self.amp.value * math.sin(t * self.freq.value)


class Controller:
    groups = { # AKAI specifiski
        "pads1": [36, 37, 38, 39,
                  40, 41, 42, 43],
        "pads2": [28, 29, 30, 31,
                  32, 33, 34, 35],
        "stages": [48, 50, 52, 53, 55, 57, 59, 60,  62, 64, 65, 67, 69, 71, 72],
        "modulators": [49, 51, 54, 56, 58, 61, 63, 66, 68, 70]
    }

    def __init__(self):
        self.input = MIDIInput()
        self.input.hook_up(self.process_input)

        self.patch = 0
        self.patches = []
        for p in range(8):
            controls = {}
            for i in range(9):
                controls[f"k{i}"] = Control(f"k{i}", 0.5)   # K* uz MIDI kontroliera
                controls[f"a{i}"] = (a := Control(f"a{i}", 0.0))
                controls[f"f{i}"] = (f := Control(f"f{i}", 0.5))
                controls[f"m{i}"] = Modulator(f"m{i}", 0.5, a, f) # modulatori
                controls[f"c{i}"] = Control(f"c{i}", 1.0)
            self.patches.append([controls, 0])

        self.stages = self.get_stages()
        self.g = TextureGenerateOnGPU(self.stage)
        #self.g = TextureFromCPU(self.stage)

        self.state = {}
        self.selection = []
        self.mod_mode = False
        self.shift = False
        self.ctrl = False

    def set_patch(self, patch):
        self.patch = patch
        self.stage = self.patches[patch][1]

    @property
    def stage(self):
        return self.stages[self.patches[self.patch][1]]

    @stage.setter
    def stage(self, i):
        self.patches[self.patch][1] = i
        self.g.mount(self.stage)

    @property
    def controls(self):
        return self.patches[self.patch][0]

    @property
    def modulators(self):
        return {m: self.controls[m] for m in self.controls if m.startswith("m")}

    @property
    def kontrols(self):
        return {f"k{i}": self.controls[f"k{i}"] + self.controls[f"m{i}"] for i in range(9)}

    def run(self):
        self.time = 0
        while True:
            self.time += 1
            self.update()

            self.input.listen()
            self.g.render(self.stage)

    def update(self):
        for m in self.modulators:
            self.modulators[m].update(self.time)

        for control in self.controls:
            if control.startswith("k") or control.startswith("m") or control.startswith("c"):
                self.g.set_uniform(control, self.controls[control].value)

    def process_input(self, msg):
        # TODO: ModulatorT monad, which collects and assigns k1k2k3k4k5... to unbound params
        match msg:
            case {'type': ('note_on' | 'note_off')}:
                self.state[msg["note"]] = msg["type"] == "note_on"
                if msg["type"] == "note_on" and msg["note"] in self.groups["stages"]:
                    if (i := self.groups["stages"].index(msg["note"])) < len(self.stages):
                        self.stage = i
                if msg["type"] == "note_off" and msg["note"] in self.groups["stages"]:
                    #self.modulators[msg["note"]].selected = False
                    pass

                if msg["type"] == "note_on" and msg["note"] in self.groups["modulators"]:
                    mod_index = self.groups["modulators"].index(msg["note"])
                    self.mod_mode = True
                    match mod_index:
                        case 5:
                            self.mod_mode = "seq"
                        case 6:
                            self.mod_mode = "seq"
                        case 7:
                            self.mod_mode = "amp"
                        case 8:
                            self.mod_mode = "freq"
                        case 9:
                            self.mod_mode = "*"
                if msg["type"] == "note_off" and msg["note"] in self.groups["modulators"]:
                    self.mod_mode = None

                if msg["type"] == "note_on" and msg["note"] in self.groups["pads1"]:
                    # states
                    if self.mod_mode == "seq":
                        mod_index = 1 + self.groups["pads1"].index(msg["note"])
                        print("mod index", mod_index)
                        self.controls[f"m{mod_index}"].seq.append(self.time)
                        print(self.controls[f"m{mod_index}"].seq)

                        #if self.shift:
                            #self.patches[msg["note"]] = copy.deepcopy(self.controls)
                    else:
                        self.set_patch(self.groups["pads1"].index(msg["note"]))
                        #self.controls = copy.deepcopy(self.patches[msg["note"]])

                if msg["type"] == "note_on" and msg["note"] == 71: # ctrl
                    self.ctrl = True
                if msg["type"] == "note_off" and msg["note"] == 71: # ctrl
                    self.ctrl = False

                if msg["type"] == "note_on" and msg["note"] == 72: # shift
                    self.shift = True
                if msg["type"] == "note_off" and msg["note"] == 72: # shift
                    self.shift = False

            case {'type': 'control_change'}:
                if self.mod_mode == "+":
                    self.controls[self.selected_control] += self.modulators[f"m{msg['control']}"]

                elif self.mod_mode == "*":
                    self.controls[self.selected_control] *= self.modulators[f"m{msg['control']}"]

                elif self.mod_mode == "amp":
                    self.controls[f"a{msg['control']}"]._value = msg["value"] / 127
                    for m in self.modulators.values():
                        print(f"{repr(m)}", end=" ")

                elif self.mod_mode == "freq":
                    self.controls[f"f{msg['control']}"]._value = msg["value"] / 127
                    for m in self.modulators.values():
                        print(f"{repr(m)}", end=" ")

                elif self.ctrl:
                    self.selected_control = f"c{msg['control']}"
                    self.controls[self.selected_control]._value = msg["value"] / 127
                    print(f"{self.selected_control} |=| {msg['value']}", end=" ")

                else:
                    self.selected_control = f"k{msg['control']}"

                    # shift
                    if self.shift:
                        self.controls[self.selected_control].offset = msg["value"] / 12700
                    else:
                        self.controls[self.selected_control]._value = msg["value"] / 127

                    for c in self.controls.values():
                        print(f"{repr(c)}", end=" ")

                    #print(f"\n {self.stage(0.1)}\n")
                    #k0, k1, k2, k3, k4, k5, k6, k7, k8 = self.kontrols.values()
                    #print(f"\n {k1, k2, k1 - k2, (((k1) - ((k2) + 1e-06)))}\n")
                    #print(f"\n {self.stage.r, float(self.stage.r)} \n")
                    #calc1 = ((k1) - ((k2) + 1e-06))
                    #calc2 = self.stage.r
                    ##import pdb; pdb.set_trace()
                    #calc1.value
                    #calc2.value

                    if self.mod_mode == "seq":
                        self.modulators[f"m{msg['control']}"].seq[self.time] = msg["value"] / 127

    def get_stages(self):
        """ Uzkonstruē spirādējumu no spiŗām """
        k0, k1, k2, k3, k4, k5, k6, k7, k8 = self.kontrols.values()
        #OutputT = lambda x: x
        hypocycloid = OutputT(Return()) \
                >> Gear(r=(k1-k2), phi=1, initial=True) \
                >> Gear(r=k2, phi=(k1-k2)/k2)

        big5 = OutputT(Return()) >> \
            Gear(r=k1, phi=k2*(k8 * 1000)) >> \
            Gear(r=k3, phi=k4*(k8 * 1000)) >> \
            Gear(r=k5, phi=k6*(k8 * 1000)) >> \
            Gear(r=k7, phi=k0*(k8 * 1000))

        big8 = OutputT(Return()) >> \
            Gear(r=k1-k2, phi=(k1/k2)*k8, initial=True) >> \
            Gear(r=k3, phi=(k1-k2)/k2) >> \
            Gear(r=k4, phi=(k1-k2-k3)/k3) >> \
            Gear(r=k5, phi=(k1-k2-k3-k4)/k4) >> \
            Gear(r=k6, phi=(k1-k2-k3-k4-k5)/k5) >> \
            Gear(r=k7, phi=(k1-k2-k3-k4-k5-k6)/k6)

        waves = OutputT(Return()) >> \
            Gear(r=k1-k2, phi=1.0, initial=True) >> \
            Gear(r=k3, phi=(k1-k2)/k2) >> \
            Gear(r=k4, phi=(k1-k2-k3)/k3) >> \
            Gear(r=k5, phi=(k1-k2-k3-k4)/k4) >> \
            Gear(r=k6, phi=(k1-k2-k3-k4-k5)/k5) >> \
            Gear(r=k7, phi=(k1-k2-k3-k4-k5-k6)/k6) >> \
            Gear(r=k8, phi=(k1-k2-k3-k4-k5-k6-k7)/k8)


        return [hypocycloid, big5, big8, waves]

if __name__ == "__main__":
    k1 = Control("k1", 0.3)
    k2 = Control("k2", 0.1)
    sp = Return() >> Gear(r=k1, phi=k2*(k1 * 1000))
    rave = Controller()
    import pdb; pdb.set_trace()
