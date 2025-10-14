import moderngl
import numpy as np

# Create a context
ctx = moderngl.create_standalone_context()

# Define your compute shader
compute_shader_code = """
#version 450

layout (local_size_x = 16, local_size_y = 16) in;

layout (rgba32f, binding = 0) writeonly uniform image2D texture;

void main() {
    ivec2 storePos = ivec2(gl_GlobalInvocationID.xy);
    vec4 pixel = vec4(1.0, 1.0, 0.0, 1.0);
    imageStore(texture, storePos, pixel);
}
"""

# Create a compute shader
compute_shader = ctx.compute_shader(compute_shader_code)
print(ctx.error)

# Create a texture
texture = ctx.texture((512, 512), 4, dtype='f4')
print(ctx.error)

# Bind the texture to the compute shader
texture.use(location=0)
compute_shader["texture"] = 0
print(ctx.error)

# Calculate the number of work groups
work_group_size_x = 16
work_group_size_y = 16
num_groups_x = (512 + work_group_size_x - 1) // work_group_size_x
num_groups_y = (512 + work_group_size_y - 1) // work_group_size_y

# Run the compute shader
texture.bind_to_image(0, read=False, write=True)
compute_shader.run(num_groups_x, num_groups_y)
print(ctx.error)

# Ensure all writes are completed
ctx.memory_barrier()
print(ctx.error)

# Read back the texture data
data = np.frombuffer(texture.read(), dtype=np.float32).reshape(512, 512, 4)
print(data)
print(data.min(), data.max())
