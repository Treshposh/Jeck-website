/* Values panel: floating academic objects in the school's green and gold. Open book with turning pages, cap, globe, books and crest. */
(function(){
  const host=document.getElementById('valuesStage');
  if(!host) return;
  const hero=host;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!window.THREE){hero.classList.add('nogl');return;}
  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch(e){hero.classList.add('nogl');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  renderer.setClearColor(0x000000,0);
  host.appendChild(renderer.domElement);

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(35,1,.1,100);
  camera.position.set(0,0,14);

  scene.add(new THREE.HemisphereLight('#fff4dc','#0b2d21',.75));
  const key=new THREE.DirectionalLight('#fff0d0',1.6);key.position.set(-6,8,10);scene.add(key);
  const rim=new THREE.DirectionalLight('#f2c318',1.1);rim.position.set(8,3,-6);scene.add(rim);
  const fillL=new THREE.PointLight('#7fd1a3',.6,30);fillL.position.set(-6,-4,6);scene.add(fillL);

  const mat=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.55,metalness:0},o));
  const GOLD=mat('#e2b33a',{roughness:.28,metalness:.85});
  const CREAM=mat('#f6efdc',{roughness:.85});
  const world=new THREE.Group();scene.add(world);
  const floaters=[];
  const add=(obj,x,y,z,amp,speed)=>{obj.position.set(x,y,z);world.add(obj);floaters.push({obj,base:new THREE.Vector3(x,y,z),ph:Math.random()*6.28,amp,speed,rx:obj.rotation.x,ry:obj.rotation.y,rz:obj.rotation.z});return obj;};

  function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return t;}
  const textTex=canvasTex(256,320,(x,w,h)=>{x.fillStyle='#f6efdc';x.fillRect(0,0,w,h);x.fillStyle='rgba(60,70,60,.28)';
    for(let y=34;y<h-24;y+=16){const len=w-50-(Math.random()<.18?Math.random()*90:0);x.fillRect(24,y,len,4);} x.fillStyle='rgba(23,84,61,.55)';x.fillRect(24,14,110,8);});

  /* ---- open book ---- */
  const book=new THREE.Group();
  const PW=1.9,PD=2.5;
  const cover=new THREE.Mesh(new THREE.BoxGeometry(PW*2+.24,.08,PD+.22),mat('#13603f',{roughness:.6}));cover.position.y=-.04;book.add(cover);
  const spine=new THREE.Mesh(new THREE.BoxGeometry(.06,.02,PD+.22),GOLD);spine.position.y=.005;book.add(spine);
  const textMat=mat('#ffffff',{map:textTex,roughness:.85});
  [-1,1].forEach(s=>{const blk=new THREE.Mesh(new THREE.BoxGeometry(PW,.2,PD),[CREAM,CREAM,textMat,CREAM,CREAM,CREAM]);blk.position.set(s*PW/2,.1,0);blk.rotation.z=-s*.045;book.add(blk);});
  const pageGeo=new THREE.PlaneGeometry(PW,PD,24,1);
  const pAttr=pageGeo.attributes.position,baseU=[],baseZ=[];
  for(let i=0;i<pAttr.count;i++){baseU.push((pAttr.getX(i)+PW/2)/PW);baseZ.push(-pAttr.getY(i));}
  const page=new THREE.Mesh(pageGeo,new THREE.MeshStandardMaterial({color:'#ffffff',map:textTex,roughness:.85,side:THREE.DoubleSide}));
  page.position.y=.23;book.add(page);
  function bendPage(rot){const curl=-1.1*Math.sin(rot);const k=curl/PW;
    for(let i=0;i<pAttr.count;i++){const s=baseU[i]*PW;let x,y;
      if(Math.abs(k)<1e-4){x=s*Math.cos(rot);y=s*Math.sin(rot);}else{x=(Math.sin(rot+k*s)-Math.sin(rot))/k;y=(Math.cos(rot)-Math.cos(rot+k*s))/k;}
      pAttr.setXYZ(i,x,y,baseZ[i]);}
    pAttr.needsUpdate=true;pageGeo.computeVertexNormals();}
  bendPage(0.02);
  book.rotation.set(.78,-.38,.05);
  add(book,.3,-1.55,.6,.1,.55);

  /* ---- crest with gold rings ---- */
  const crestG=new THREE.Group();
  const loader=new THREE.TextureLoader();
  const crestTex=loader.load((window.JECK_DATA&&window.JECK_DATA['assets/crest.png'])||'assets/crest.png',()=>{if(reduce)draw(0,1.2);});crestTex.encoding=THREE.sRGBEncoding;crestTex.anisotropy=8;
  const crest=new THREE.Mesh(new THREE.PlaneGeometry(2.1,1.98),new THREE.MeshStandardMaterial({map:crestTex,transparent:true,alphaTest:.05,roughness:.5,side:THREE.DoubleSide}));
  crestG.add(crest);
  const ring1=new THREE.Mesh(new THREE.TorusGeometry(1.45,.022,12,120),GOLD);crestG.add(ring1);
  const ring2=new THREE.Mesh(new THREE.TorusGeometry(1.62,.012,12,120),GOLD);crestG.add(ring2);
  add(crestG,.35,1.75,-1.2,.14,.45);

  /* ---- graduation cap ---- */
  const cap=new THREE.Group();
  const capDark=mat('#0d2a1f',{roughness:.65});
  const board=new THREE.Mesh(new THREE.BoxGeometry(1.7,.07,1.7),capDark);cap.add(board);
  const crown=new THREE.Mesh(new THREE.CylinderGeometry(.56,.64,.55,32,1,true),capDark);crown.position.y=-.3;cap.add(crown);
  const crownBot=new THREE.Mesh(new THREE.CircleGeometry(.64,32),capDark);crownBot.rotation.x=Math.PI/2;crownBot.position.y=-.575;cap.add(crownBot);
  const btn=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.05,16),GOLD);btn.position.y=.06;cap.add(btn);
  const cord=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,1.15,6),GOLD);cord.rotation.z=Math.PI/2;cord.rotation.y=-Math.PI/4;cord.position.set(.4,.06,.4);cap.add(cord);
  const tassel=new THREE.Group();tassel.position.set(.8,.06,.8);cap.add(tassel);
  const tCord=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.5,6),GOLD);tCord.position.y=-.25;tassel.add(tCord);
  const tEnd=new THREE.Mesh(new THREE.ConeGeometry(.09,.3,12),GOLD);tEnd.position.y=-.6;tassel.add(tEnd);
  cap.rotation.set(.45,.5,-.18);
  add(cap,3.15,2.35,-1.6,.16,.6);

  /* ---- globe ---- */
  const globe=new THREE.Group();
  const gTex=canvasTex(1024,512,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#1d6a4a');g.addColorStop(1,'#0f3b2b');x.fillStyle=g;x.fillRect(0,0,w,h);
    x.strokeStyle='rgba(242,195,24,.75)';x.lineWidth=2.2;for(let i=1;i<12;i++){x.beginPath();x.moveTo(0,i*h/12);x.lineTo(w,i*h/12);x.stroke();}for(let i=0;i<24;i++){x.beginPath();x.moveTo(i*w/24,0);x.lineTo(i*w/24,h);x.stroke();}
    x.fillStyle='rgba(242,195,24,.22)';[[180,170,120,90],[260,300,70,110],[520,150,150,80],[560,260,80,120],[760,180,140,90],[840,330,70,50]].forEach(([cx,cy,rx,ry])=>{x.beginPath();x.ellipse(cx,cy,rx,ry,.3,0,Math.PI*2);x.fill();});});
  const sphere=new THREE.Mesh(new THREE.SphereGeometry(.85,48,32),mat('#ffffff',{map:gTex,roughness:.4,metalness:.1}));
  const tilt=new THREE.Group();tilt.rotation.z=.41;tilt.add(sphere);globe.add(tilt);
  const mer=new THREE.Mesh(new THREE.TorusGeometry(.98,.03,10,80,Math.PI*1.4),GOLD);mer.rotation.z=.41+Math.PI*.8;globe.add(mer);
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.35,10),GOLD);stem.position.y=-1.1;globe.add(stem);
  const foot=new THREE.Mesh(new THREE.CylinderGeometry(.42,.5,.12,32),GOLD);foot.position.y=-1.3;globe.add(foot);
  globe.rotation.set(.12,0,0);
  add(globe,-2.85,.75,-1.4,.12,.5);

  /* ---- stack of books ---- */
  const stack=new THREE.Group();
  [['#13603f',1.55,.28,1.1,0],['#9e2a24',1.4,.24,1.0,.18],['#c99a2b',1.3,.22,.95,-.12]].forEach(([c,w,h,d,ry],i)=>{
    const cm=mat(c,{roughness:.5}),pg=mat('#f3ead2',{roughness:.9});
    const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),[pg,cm,cm,cm,pg,pg]);
    let y=0;for(let j=0;j<i;j++)y+=[.28,.24,.22][j];b.position.y=y+h/2;b.rotation.y=ry;stack.add(b);
    const band=new THREE.Mesh(new THREE.BoxGeometry(.02,h+.01,d*.98),GOLD);band.position.set(-w/2+.18,y+h/2,0);band.rotation.y=ry;stack.add(band);});
  stack.rotation.set(.35,-.6,.08);
  add(stack,3.0,-1.7,.2,.1,.65);

  /* ---- pencil ---- */
  const pencil=new THREE.Group();
  const pb=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,1.7,6),mat('#f2c318',{roughness:.5}));pencil.add(pb);
  const tip=new THREE.Mesh(new THREE.ConeGeometry(.09,.3,6),mat('#e9d2a6'));tip.position.y=-1;tip.rotation.x=Math.PI;pencil.add(tip);
  const lead=new THREE.Mesh(new THREE.ConeGeometry(.03,.1,6),mat('#222'));lead.position.y=-1.12;lead.rotation.x=Math.PI;pencil.add(lead);
  const fer=new THREE.Mesh(new THREE.CylinderGeometry(.095,.095,.14,12),GOLD);fer.position.y=.92;pencil.add(fer);
  const er=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.14,12),mat('#c8322b'));er.position.y=1.06;pencil.add(er);
  pencil.rotation.set(.3,0,-1.1);
  add(pencil,-2.6,-1.9,.9,.12,.7);

  /* ---- gold dust ---- */
  const N=reduce?60:170;const pts=new Float32Array(N*3),spd=new Float32Array(N);
  for(let i=0;i<N;i++){pts[i*3]=(Math.random()-.5)*14;pts[i*3+1]=(Math.random()-.5)*10;pts[i*3+2]=(Math.random()-.5)*6-1;spd[i]=.15+Math.random()*.35;}
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pts,3));
  const dot=canvasTex(64,64,(x)=>{const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,230,150,1)');g.addColorStop(.35,'rgba(242,195,24,.6)');g.addColorStop(1,'rgba(242,195,24,0)');x.fillStyle=g;x.fillRect(0,0,64,64);});
  const dust=new THREE.Points(pg,new THREE.PointsMaterial({size:.12,map:dot,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  scene.add(dust);

  /* ---- framing ---- */
  let W=1,H=1;
  function resize(){
    W=host.clientWidth;H=host.clientHeight;renderer.setSize(W,H,false);
    camera.aspect=W/H;camera.fov=40;world.scale.setScalar(.82);world.position.x=-.15;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize',resize);resize();

  let tx=0,ty=0,px=0,py=0;
  hero.addEventListener('pointermove',e=>{const r=hero.getBoundingClientRect();tx=(e.clientX-r.left)/r.width-.5;ty=(e.clientY-r.top)/r.height-.5;});
  hero.addEventListener('pointerleave',()=>{tx=0;ty=0;});

  let visible=true;
  if('IntersectionObserver' in window)new IntersectionObserver(es=>{visible=es[0].isIntersecting;},{threshold:0}).observe(host);
  const clk=new THREE.Clock();
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const CYCLE=4.2,FLIP=1.7;

  function draw(dt,t){
    // page turn
    const c=t%CYCLE;const r=c<FLIP?ease(c/FLIP)*Math.PI*.985+.02:.02;bendPage(reduce?.02:r);
    floaters.forEach(f=>{const s=Math.sin(t*f.speed+f.ph);f.obj.position.y=f.base.y+s*f.amp;f.obj.rotation.x=f.rx+Math.sin(t*f.speed*.7+f.ph)*.05;f.obj.rotation.z=f.rz+Math.cos(t*f.speed*.6+f.ph)*.04;});
    crestG.rotation.y=Math.sin(t*.4)*.28;ring1.rotation.x=t*.35;ring1.rotation.y=t*.2;ring2.rotation.y=-t*.28;ring2.rotation.x=Math.PI/2+Math.sin(t*.3)*.3;
    sphere.rotation.y=t*.25;
    cap.rotation.y=.5+Math.sin(t*.35)*.25;tassel.rotation.z=Math.sin(t*1.3)*.18;tassel.rotation.x=Math.cos(t*1.1)*.12;
    stack.rotation.y=-.6+Math.sin(t*.3)*.12;
    const a=pg.attributes.position;
    for(let i=0;i<N;i++){let y=a.getY(i)+spd[i]*dt;if(y>5)y=-5;a.setY(i,y);a.setX(i,a.getX(i)+Math.sin(t*.5+i)*.002);}a.needsUpdate=true;
    px+=(tx-px)*.05;py+=(ty-py)*.05;
    world.rotation.y=px*.35;world.rotation.x=py*.18;
    
    renderer.render(scene,camera);
  }
  if(reduce){draw(0,1.2);addEventListener('resize',()=>draw(0,1.2));}
  else{
    (function loop(){requestAnimationFrame(loop);const dt=Math.min(clk.getDelta(),.05);if(!visible||document.hidden)return;draw(dt,clk.elapsedTime);})();
  }
  hero.classList.add('gl-ready');
})();
