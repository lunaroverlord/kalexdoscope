uniform vec2 mouse;

vec3   iResolution = vec3(RENDERSIZE, 1.0);
float  iGlobalTime = TIME;

float gTime = iGlobalTime*0.5;

void main( void )
{
	float f = 1.0;
	float g = 1.0;
	vec2 res = iResolution.xy;
	vec2 mou = mouse.xy;
	
	//if (mouse.x < 0.5)
	//{
	mou.x = sin(gTime * e)*sin(gTime * u) * 1. + sin(gTime * m);
	mou.y = (1.0-cos(gTime * c))*sin(gTime * s)*1.0+cos(gTime * k);
	mou = (mou+1.0) * res;
	//}
	vec2 z = ((-res+2.0 * gl_FragCoord.xy) / res.y);
	vec2 p = ((-res+2.0+mou) / res.y) * j;
	for( int i = 0; i < 24; i++) 
	{
		float d = dot(z,z);
		z = (vec2( z.x, -z.y ) / d) + p * h; 
		z.x =  1.0-abs(z.x);
		f = max( f-d, (dot(z-p,z-p) ));
		g = min( g*d, sin(dot(z+p,z+p))+1.0);
	}
	f = abs(-log(f) / 3.5);
	g = abs(-log(g) / 8.0);
	gl_FragColor = vec4(min(vec3(g, g*f, f), 1.0),1.0);
}
