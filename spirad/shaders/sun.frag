#version 330
out vec4 FragColor;
uniform float time;
uniform float k0;
uniform float k1;
uniform float k2;
uniform float k3;
uniform float k4;
uniform float k5;
uniform float k6;

const vec2 res = vec2(500.0, 500.0);

#define pi 3.1415926535897932384626433832
//#define in_ring 0.1  //Inner radius
//#define out_ring 0.5

void main_r()
{
    vec2 uv = gl_FragCoord.xy / res.xy;
    uv -= 0.5;
    float R = k1, r = k2, d = k3;
    float col = 0.0;
    for (float t = 0.0; t < 2.0 * 3.14159; t += 0.008)
    {
        vec2 c = vec2((R - r) * cos(t) + d * cos((R - r) / r * t), (R - r) * sin(t) - d * sin((R - r) / r * t));
        float dist = length(uv - c);
        if (dist < 0.01)
            col += 0.001 / dist;
    }
    vec3 color = vec3(min(col, 1.0), 0.0, 0.0);
    FragColor = vec4(color, 1.0);
}


void main_lk()
{
    vec2 uv = gl_FragCoord.xy / res.xy;
    uv -= 0.5;
    float r = 0.3; //length(uv);
    float a = atan(uv.y, uv.x);
    float col = 0.0;
    float k = k1;
    float l = k2;
    float j = k3;
    float points = 200.0;
    for (float i=0.0; i<2*pi; i+=pi/points)
    {
        float t = i;
        float x = (1 - k) * cos(t);
        float y = (1 - k) * sin(t); 
        col += (0.1/points) / smoothstep(0.0, 0.1, distance(uv, r*vec2(x, y)));

        x += (l * k * cos((1 - k) / k * t));
        y += (- l * k * sin((1 - k) / k * t));
        col += (0.1/points) / smoothstep(0.0, 0.1, distance(uv, r*vec2(x, y)));

        x += (l * k * j * cos((1 - (l)) / l * t));
        y += (- l * k * j * sin((1 - (l)) / l * t));
        col += (0.1/points) / smoothstep(0.0, 0.1, distance(uv, r*vec2(x, y)));
    }
    vec3 color = vec3(min(col, 1.0), 0.0, 0.0);
    FragColor = vec4(color, 1.0);
}

void main() 
{
    vec2 R = res.xy; 
    vec2 u = gl_FragCoord.xy - R/2.; 
    float a = k2;
    float b = k3;
    float d = k4;
    float c = k5 * 200.0 * d; 
    float fi=atan(u.x,u.y); 
    vec3 col = vec3(0.,0.,1.); 
    for (float i=0.0; i<pi; i+=pi/16.)
    {
        float temp1 = i + c*fi - k1; 
        float temp2 = i + d*fi + k1; 
        col += (0.001 * k6) / abs(a + b*sin(temp1)*sin(temp2) - length(u)/(R.y/1.15));
    } 
    FragColor = vec4(col, 1.0);
} 

void main_spiro_colors()
{
    vec2 uv = (gl_FragCoord.xy-res.xy*0.5) / res.y;
    
    float ang = fract(atan(-uv.y,-uv.x)/atan(1.0)*0.125+0.5)+k1*0.1;
    float len = length(uv);
    vec3 col1 = vec3(0.0);
    for(float i = 0.0;i<11.0;i+=1.0)
    {
        float tang = (ang+i)*pi*2.0;
        float tlen = (cos((ang+i)*8.0)*0.5+0.5)*(k1-k2)+k2;
        vec2 pos = normalize(uv)*tlen;
    	col1 += smoothstep(0.005,0.0,distance(uv,pos)*pow(length(uv),0.25))
            *(cos(tang+vec3(0.0,2.0*pi,4.0*pi)/3.0)*0.5+0.5);
    }
    FragColor = vec4(col1,1.0);
}

void main_2() {
    float r = length(gl_FragCoord.xy / 500.0 - 0.5);
    float theta = atan(gl_FragCoord.y - 250.0, gl_FragCoord.x - 250.0) * time;
    float x = r * cos(10.0 * theta) + 0.3 * cos(30.0 * r);
    float y = r * sin(10.0 * theta) - 0.3 * sin(30.0 * r);
    if (x * x + y * y < 0.01) {
        FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    } else {
        FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
}

void main_sun()
{
    vec2 res = vec2(500.0, 500.0);
    vec2 uv = (gl_FragCoord.xy - 0.5 * res.xy) / min(res.y, res.x);
    vec3 c = vec3(0.0);
    float a = atan(uv.x, uv.y) / 2.0;
    float r = length(uv);
    float d = 0.3 / (0.1 + abs(sin(10.0 * time * (a + time)) - r));
    c += d * vec3(1.0, 0.5, 0.2);
    FragColor = vec4(c, 1.0);
}


void main_drops()
{
    vec2 uv = gl_FragCoord.xy / res.xy;
    uv -= 0.5;

    float R = k1, r = k2, d = k3;

    vec3 color = vec3(0.0);
    for(float t = 0.0; t <= 2.0 * 3.14159; t += 0.01)
    {
        vec2 c = vec2(R*cos(t) - r*cos((R/r)*t), R*sin(t) - r*sin((R/r)*t));
        c += d * vec2(cos((R/r)*t), sin((R/r)*t));

        float dist = length(uv - c);
        color += vec3(smoothstep(k4, k5, dist));
    }
    FragColor = vec4(vec3(color), 1.0);
}
