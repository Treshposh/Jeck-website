/* JECK films: photographs played as 3D motion pictures.
   Each scene is a photo plus a depth map; a moving virtual camera creates real parallax
   between near and far objects, with slow dolly pushes and a gold light-sweep between scenes. */
(function(){
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  const VS='attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;v.y=1.-v.y;gl_Position=vec4(p,0.,1.);}';
  const FS=`precision highp float;
varying vec2 v;
uniform sampler2D uA,uDA,uB,uDB;
uniform vec2 uRes,uSA,uSB,uFA,uFB;
uniform float uMix,uTA,uTB,uDirA,uDirB,uTime,uDepthAmt;
uniform vec2 uMouse;
vec2 cover(vec2 uv,vec2 img,vec2 f){float ra=uRes.x/uRes.y,ri=img.x/img.y;vec2 s=ra>ri?vec2(1.,ri/ra):vec2(ra/ri,1.);
  vec2 o=(f-.5)*(1.-s);return clamp((uv-.5)*s+.5+o,0.,1.);}
vec3 scene(sampler2D img,sampler2D dep,vec2 size,vec2 f,float t,float dir){
  float zoom=1.1+.09*t;
  vec2 uv=(v-.5)/zoom+.5;
  uv+=vec2(dir*(t-.5)*.035,(t-.5)*-.012);
  vec2 cam=vec2(sin(t*3.14159*.9+dir)*.6+uMouse.x*.8,cos(t*2.4)*.25+uMouse.y*.5)*uDepthAmt;
  vec2 c=cover(uv,size,f);
  float d=texture2D(dep,c).r;
  c=cover(uv+cam*(d-.45),size,f);
  d=texture2D(dep,c).r;
  c=cover(uv+cam*(d-.45),size,f);
  return texture2D(img,c).rgb;
}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec3 a=scene(uA,uDA,uSA,uFA,uTA,uDirA);
  vec3 col=a;
  if(uMix>0.){
    vec3 b=scene(uB,uDB,uSB,uFB,uTB,uDirB);
    float edge=v.x*.75+(1.-v.y)*.25;
    float pos=uMix*1.5-.25;
    float m=smoothstep(pos-.18,pos+.18,edge);
    col=mix(b,a,m);
    float glow=exp(-pow((edge-pos)/.09,2.))*sin(uMix*3.14159);
    col+=vec3(1.,.78,.32)*glow*.32;
  }
  // grade: warm highlights, deep green shadows, soft vignette, fine grain
  col=mix(col,col*vec3(.92,1.02,.96),.25);
  col=pow(col,vec3(.97));
  float vig=smoothstep(1.15,.35,length((v-.5)*vec2(1.1,1.)));
  col*=mix(.72,1.,vig);
  col+=(hash(v*uRes+uTime)-.5)*.025;
  gl_FragColor=vec4(col,1.);
}`;

  function initFilm(el){
    let scenes;try{scenes=JSON.parse(el.dataset.scenes);}catch(e){return;}
    const dur=+el.dataset.dur||7,fade=1.6,depthAmt=+el.dataset.depth||.028;
    // poster fallback (also what shows before WebGL is ready)
    const poster=document.createElement('img');poster.className='film-poster';poster.src=scenes[0].img;poster.alt='';el.appendChild(poster);
    const cv=document.createElement('canvas');cv.className='film-canvas';el.appendChild(cv);
    const gl=cv.getContext('webgl',{antialias:false,premultipliedAlpha:false})||cv.getContext('experimental-webgl');
    // controls
    const ctr=document.createElement('div');ctr.className='film-ctrl';
    const btn=document.createElement('button');btn.type='button';btn.className='film-btn';btn.setAttribute('aria-label','Pause film');
    btn.innerHTML='<svg viewBox="0 0 24 24" class="i-pause"><path d="M8 5v14M16 5v14"/></svg><svg viewBox="0 0 24 24" class="i-play"><path d="M7 5l12 7-12 7Z"/></svg>';
    const dots=document.createElement('div');dots.className='film-dots';
    scenes.forEach((s,i)=>{const d=document.createElement('i');dots.appendChild(d);});
    ctr.appendChild(btn);ctr.appendChild(dots);el.appendChild(ctr);
    let dead=false,running=false,paused=reduce,clock=0,last=performance.now(),visible=true;
    const setBtn=()=>{el.classList.toggle('paused',paused);btn.setAttribute('aria-label',paused?'Play film':'Pause film');};setBtn();
    btn.addEventListener('click',()=>{paused=!paused;setBtn();last=performance.now();});
    if(!gl){el.classList.add('film-nogl');cssFallback();return {destroy(){}};}

    const sh=(t,src)=>{const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.warn(gl.getShaderInfoLog(s));return null;}return s;};
    const prog=gl.createProgram();const vs=sh(gl.VERTEX_SHADER,VS),fs=sh(gl.FRAGMENT_SHADER,FS);
    if(!vs||!fs){el.classList.add('film-nogl');cssFallback();return {destroy(){}};}
    gl.attachShader(prog,vs);gl.attachShader(prog,fs);gl.linkProgram(prog);gl.useProgram(prog);
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(prog,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    const U={};['uA','uDA','uB','uDB','uRes','uSA','uSB','uFA','uFB','uMix','uTA','uTB','uDirA','uDirB','uTime','uDepthAmt','uMouse'].forEach(n=>U[n]=gl.getUniformLocation(prog,n));
    gl.uniform1i(U.uA,0);gl.uniform1i(U.uDA,1);gl.uniform1i(U.uB,2);gl.uniform1i(U.uDB,3);gl.uniform1f(U.uDepthAmt,depthAmt);

    function tex(src,cb){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([20,60,43,255]));
      const im=new Image();im.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        cb&&cb(im);};im.src=(window.JECK_DATA&&window.JECK_DATA[src])||src;
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      return t;}
    let ready=0;
    const S=scenes.map((s,i)=>{const o={img:null,dep:null,w:16,h:9,f:[s.fx??.5,s.fy??.5],dir:i%2?-1:1,ok:false};
      o.img=tex(s.img,im=>{o.w=im.naturalWidth;o.h=im.naturalHeight;o.ok=true;ready++;});
      o.dep=tex(s.depth);return o;});

    let mx=0,my=0,tmx=0,tmy=0;
    el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();tmx=((e.clientX-r.left)/r.width-.5)*.6;tmy=((e.clientY-r.top)/r.height-.5)*.6;});
    el.addEventListener('pointerleave',()=>{tmx=0;tmy=0;});
    if('IntersectionObserver' in window)new IntersectionObserver(es=>{visible=es[0].isIntersecting;},{threshold:0}).observe(el);

    function resize(){const r=el.getBoundingClientRect();const pr=Math.min(devicePixelRatio,1.75);cv.width=Math.max(2,Math.round(r.width*pr));cv.height=Math.max(2,Math.round(r.height*pr));gl.viewport(0,0,cv.width,cv.height);}
    addEventListener('resize',resize);resize();requestAnimationFrame(resize);

    const N=S.length,step=dur;
    function bind(unit,t){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);}
    function render(){
      const idx=Math.floor(clock/step)%N,local=clock%step;
      const a=S[idx],b=S[(idx+1)%N];
      const total=step+fade; // each scene lives for step+fade seconds
      const tA=(local+fade)/total;
      let mix=0,tB=0;
      if(local>step-fade){mix=(local-(step-fade))/fade;tB=(local-(step-fade))/total;}
      bind(0,a.img);bind(1,a.dep);bind(2,b.img);bind(3,b.dep);
      gl.uniform2f(U.uRes,cv.width,cv.height);
      gl.uniform2f(U.uSA,a.w,a.h);gl.uniform2f(U.uSB,b.w,b.h);
      gl.uniform2f(U.uFA,a.f[0],a.f[1]);gl.uniform2f(U.uFB,b.f[0],b.f[1]);
      gl.uniform1f(U.uMix,mix*mix*(3.-2.*mix));gl.uniform1f(U.uTA,tA);gl.uniform1f(U.uTB,tB);
      gl.uniform1f(U.uDirA,a.dir);gl.uniform1f(U.uDirB,b.dir);gl.uniform1f(U.uTime,(clock*7)%100);
      gl.uniform2f(U.uMouse,mx,my);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      if(!el.classList.contains('film-ready')&&a.ok)el.classList.add('film-ready');
      [...dots.children].forEach((d,i)=>d.classList.toggle('on',i===idx));
    }
    function loop(now){
      if(dead)return;
      requestAnimationFrame(loop);
      const dt=Math.min((now-last)/1000,.05);last=now;
      mx+=(tmx-mx)*.04;my+=(tmy-my)*.04;
      if(!visible||document.hidden||!ready)return;
      if(!paused)clock+=dt;
      render();
    }
    if(reduce){clock=step*.35;const once=()=>{if(ready){render();}else requestAnimationFrame(once);};once();addEventListener('resize',()=>ready&&render());
      btn.addEventListener('click',()=>{if(!paused&&!running){running=true;last=performance.now();requestAnimationFrame(loop);}});}
    else{running=true;requestAnimationFrame(loop);}

    function cssFallback(){el.classList.add('film-ready');}
    return {destroy(){dead=true;removeEventListener('resize',resize);try{const x=gl.getExtension('WEBGL_lose_context');x&&x.loseContext();}catch(e){}}};
  }
  window.JeckFilm={init:initFilm};

  document.querySelectorAll('.film:not([data-manual])').forEach(initFilm);
})();
