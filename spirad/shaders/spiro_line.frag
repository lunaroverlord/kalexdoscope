#version 450
uniform vec3      iResolution;           // viewport resolution (in pixels)
uniform float     iTime;                 // shader playback time (in seconds)
uniform float     iTimeDelta;            // render time (in seconds)
uniform float     iFrameRate;            // shader frame rate
uniform int       iFrame;                // shader playback frame
uniform float     iChannelTime[4];       // channel playback time (in seconds)
uniform vec3      iChannelResolution[4]; // channel resolution (in pixels)
uniform vec4      iMouse;                // mouse pixel coords. xy: current (if MLB down)
uniform vec4      iDate;                 // (year, month, day, time in seconds)

out vec4 fragColor;
uniform float time;
uniform float k0;
uniform float k1;
uniform float k2;
uniform float k3;
uniform float k4;
uniform float k5;
uniform float k6;
uniform float k7;
uniform float k8;

uniform float m0;
uniform float m1;
uniform float m2;
uniform float m3;
uniform float m4;
uniform float m5;
uniform float m6;
uniform float m7;
uniform float m8;

uniform float c0;
uniform float c1;
uniform float c2;
uniform float c3;
uniform float c4;
uniform float c5;
uniform float c6;
uniform float c7;
uniform float c8;

#define polar(l,a) (l*vec2(cos(a),sin(a)))
#define pi 3.1415926535897932384626433832
// kalex: k3=0.0945, k1=0.236, k2=0.023

float tau = atan(1.0)*8.0;

float timeScale = 20.0;

float distLine(vec2 p0,vec2 p1,vec2 uv)
{
	vec2 dir = normalize(p1 - p0);
	uv = (uv - p0) * mat2(dir.x, dir.y,-dir.y, dir.x);
	return distance(uv, clamp(uv, vec2(0), vec2(distance(p0, p1), 0)));   
}

ivec2 spirograph(float t)
{
    float x = 0;
    float y = 0;

    #generate_spirograph

    return ivec2((2 + x)/4*1024, (2 + y)/4*1024); 
}

void main()
{
    vec2 fragCoord = gl_FragCoord.xy;
    float frameTime = (1.0 / 60.0) * timeScale;

    vec2 aspect = iResolution.xy / iResolution.y;
	vec2 uv = fragCoord.xy / iResolution.y - aspect/2.0;
    
    float lineRad = 1.0 / iResolution.y;
    
    float curTime = k5 * timeScale;
    float lastTime = curTime - frameTime;
    
    vec3 col = vec3(0.0);
    vec2 last_spiro = spirograph(0.0);
    for(float i = 0; i < 2*pi; i+=0.01)
    {

        vec2 this_spiro = spirograph(i);
        float dist = distLine(last_spiro, this_spiro, uv);
        last_spiro = this_spiro;
        //col += vec3(1.0 - smoothstep(0.0, 0.1, dist));
        if(dist < lineRad)
        { 
            col += vec3(1.0);
        }
    }
    
    fragColor = vec4(col,1.0);
}
