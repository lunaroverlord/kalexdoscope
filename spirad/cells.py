#%%
import mido
#%%

input_names = mido.get_input_names()

for name in input_names:
    print(name)

#%%
with mido.open_input(input_names[1]) as inport:
    for msg in inport:
        print(msg)
#%%


