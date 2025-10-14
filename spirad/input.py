import mido

class MIDIInput:
    def __init__(self):
        input_names = mido.get_input_names()

        for name in input_names:
            print(name)

        self.inport = mido.open_input(input_names[-1])
        self.hooks = []

    def hook_up(self, fn):
        self.hooks.append(fn)

    def listen(self):
        for msg in self.inport.iter_pending():
            for hook in self.hooks:
                hook(vars(msg))
