// Example : Converted Shadertoy script (Source script : https://www.shadertoy.com/view/MtK3Wc)
// Most single file Shadertoy sketchs can be imported by going to https://www.shadertoy.com selecting a single file shader (no buffers) then copy pasting it and clicking on the eye icon to convert it.
// Note : Must add synthOutput and assign gl_FragColor alpha channel if conversion fail or there is no output.

mat2 m=mat2(.8,-.6,.6,.8);

float g(vec2 p){
    float e=abs(sin(p.x+sin(p.y)));p=m*p;
	return .1*(e+sin(p.x+sin(p.y)));
}

float n(vec2 p){
    p*=.1;
    float s=5.,t=.9;
	for(int i=0;i<9;i++)
        t-=s*g(p),s*=.4,p=m*2.1*p+t;
    return 3.-exp(t);
}

void main (){
    float v=globalTime*2.,u=sin(v*.1),x=.0,p=.0,o=.0;
	vec3 r=vec3(gl_FragCoord.xy/resolution.xy-1.,0),z,y;
	for(int d=0;d<288;d++)        
        if (p*.0002<=x)
			z=vec3(0,-8.*g(vec2(0,v)*.1),v)+p*normalize(vec3(r.x-u,r.y*.3+.1,2)),x=z.y+n(z.xz),p+=x,o++;
    x=n(z.xz);
    y=normalize(vec3(n(z.xz-vec2(.01,0))-x,0,n(z.xz-vec2(0,.01))-x-n(z.zx*11.)*.002));
  
    // must be added to work in Fragment
    synthOutput = vec4(0.);
  
    // alpha channel must be set in Fragment
    fragColor = vec4(dot(vec3(-.5),y)*n(z.zx*6.)*vec3(.1,.2,.3)+.1+o*.002+log(p)*.1, 1.);
}
