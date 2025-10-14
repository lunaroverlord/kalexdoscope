import os
os.environ["MESA_GL_VERSION_OVERRIDE"]="4.5"

import mido
import moderngl
import numpy as np
import glfw


class Graphics:
    """ GLFW konteksts """
    def __init__(self):
        # Initialize GLFW
        if not glfw.init():
            exit()

        self.width, self.height = 640, 480
        self.window = glfw.create_window(self.width, self.height, "Spiro", None, None)
        glfw.make_context_current(self.window)
        glfw.set_window_size_callback(self.window, self.resize)
        self.iterations = 0

        self.ctx = moderngl.create_context()
        self.s = None

    def resize(self, window, width, height):
        print(" resize ", width, height)
        self.width, self.height = width, height
        self.ctx.viewport = (0, 0, width, height)
        self.ctx.clear(0.0, 0.0, 0.0)
        self.set_shaders(self.s)

    def set_uniform(self, key, value):
        try:
            self.prog[key] = value
        except KeyError:
            return

    def render_program(self, s):
        pass

    def render(self, s):
        self.iterations += 1
        self.render_program(s)

        # Swap buffers and poll events
        glfw.swap_buffers(self.window)
        glfw.poll_events()

        if glfw.window_should_close(self.window):
            glfw.terminate()


class TextureFromCPU(Graphics):

    def __init__(self, s):
        super().__init__()
        self.set_shaders(None)
        self.texture = self.ctx.texture((500, 500), 1, self.to_texture(s).tobytes(), dtype='f4')
        self.texture.use(0)
        self.texture.filter = (self.ctx.LINEAR, self.ctx.LINEAR)
        self.set_uniform("texture", 0)

    @staticmethod
    def to_texture(s):
        data = np.zeros((1000, 1000), dtype='f4')
        for i in range(1000):
            x, y = s((i/1000) * (2*3.14))
            data[int(500.0 * (2.0 + x) / 4.0),
                 int(500.0 * (2.0 + y) / 4.0)] += 1.0
        return data[:500, :500]

    def set_shaders(self, s):
        vertex_shader = """
        #version 330
        in vec2 in_vert;
        void main() {
            gl_Position = vec4(in_vert, 0.0, 1.0);
        }
        """

        with open("shaders/texture.frag") as f:
            fragment_shader = f.read()

        self.prog = self.ctx.program(vertex_shader=vertex_shader,
                                     fragment_shader=fragment_shader)
        self.set_uniform("iResolution", (500, 500, 1))
        self.set_uniform("iTime", 0)

        vertices = np.array([-1.0,  1.0, -1.0, -1.0, 1.0,  1.0, 1.0, -1.0], dtype='f4')
        buffer = self.ctx.buffer(vertices)
        self.vao = self.ctx.simple_vertex_array(self.prog, buffer, 'in_vert')

    def mount(self, s):
        self.s = s
        self.set_shaders(s)

    def render_program(self, s):
        self.texture.write(self.to_texture(s).tobytes())
        self.set_uniform("iTime", self.iterations)
        self.ctx.clear()
        self.vao.render(moderngl.TRIANGLE_STRIP)


class TextureGenerateOnGPU(Graphics):
    def __init__(self, s):
        super().__init__()
        self.mount(s)

    def mount(self, s):
        self.s = s
        self.set_shaders(s)

    def set_shaders(self, s):
        vertex_shader = """
        #version 330
        in vec2 in_vert;
        void main() {
            gl_Position = vec4(in_vert.x, in_vert.y, 0.0, 1.0);
        }
        """
        #with open("shaders/generate_spiro.vert") as f:
            #vertex_shader = f.read()
        with open("shaders/texture.frag") as f:
            fragment_shader = f.read()

        self.prog = self.ctx.program(vertex_shader=vertex_shader,
                                     fragment_shader=fragment_shader)
        self.set_uniform("iResolution", (self.width, self.height, 4))

        self.update_compute_shader(s)

        self.texture = self.ctx.texture((1024, 1024), 4, dtype='f4')

        #self.set_uniform("texture", 0)
        self.texture.bind_to_image(0, read=False, write=True)
        self.texture.use(location=0)

        vertices = np.array([-1.0,  1.0, -1.0, -1.0, 1.0,  1.0, 1.0, -1.0], dtype='f4')
        buffer = self.ctx.buffer(vertices)
        self.vao = self.ctx.simple_vertex_array(self.prog, buffer, 'in_vert')

    def update_compute_shader(self, s):
        with open("shaders/generate_spiro.comp") as f:
            print("glsl", s.glsl())
            compute_shader = f.read().replace("#generate_spirograph",
                                              s.glsl())
        self.compute_shader = self.ctx.compute_shader(compute_shader)
        print(self.ctx.error)


    def render_program(self, s):
        self.ctx.clear()
        work_group_size_x = 16
        work_group_size_y = 16

        num_groups_x = (1024 + work_group_size_x - 1) // work_group_size_x
        num_groups_y = (1024 + work_group_size_y - 1) // work_group_size_y

        self.texture.write(b'\x00' * 1024 * 1024 * 4 * 4)
        self.compute_shader.run(num_groups_x, num_groups_y)
        self.ctx.memory_barrier()  # Ensure all writes are completed

        #data = np.frombuffer(self.texture.read(), dtype=np.float32).reshape(1024, 1024, 4)

        self.set_uniform("iTime", self.iterations)
        self.vao.render(moderngl.TRIANGLE_STRIP)

    def set_uniform(self, key, value):
        try:
            #print("setting shader", key, value)
            self.compute_shader[key] = value
        except (KeyError, AttributeError):
            super().set_uniform(key, value)
