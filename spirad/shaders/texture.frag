#version 330
uniform sampler2D texture;
out vec4 color;
uniform vec3      iResolution;
uniform float     iTime;

void main()
{
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    //float value = ;
    color = vec4(texture2D(texture, uv).rgba);
}
