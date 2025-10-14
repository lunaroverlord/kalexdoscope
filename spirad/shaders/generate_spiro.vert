#version 450

layout (location = 0) in vec3 aPos;
layout (location = 1) in vec2 aTexCoords;

uniform float aspect_ratio;
out vec2 TexCoords;

void main()
{
    gl_Position = vec4(aPos.x * aspect_ratio, aPos.y, 0.0, 1.0);
    TexCoords = aTexCoords;
}
