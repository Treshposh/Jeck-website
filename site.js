(function(){
  const $=id=>document.getElementById(id);
  const lock=on=>{document.body.style.overflow=on?'hidden':'';};

  /* mobile menu */
  const drawer=$('drawer'),open=$('menuOpen'),close=$('menuClose');
  if(drawer&&open){
    open.addEventListener('click',()=>{drawer.hidden=false;lock(true);close&&close.focus();});
    const shut=()=>{drawer.hidden=true;lock(false);open.focus();};
    close&&close.addEventListener('click',shut);
    drawer.addEventListener('click',e=>{if(e.target.closest('a'))setTimeout(()=>{drawer.hidden=true;lock(false);},50);});
    addEventListener('keydown',e=>{if(e.key==='Escape'&&!drawer.hidden)shut();});
  }

  /* mega menu: close after choosing a link, and on Escape */
  document.querySelectorAll('.mnav > div').forEach(d=>{
    d.addEventListener('keydown',e=>{if(e.key==='Escape'){d.querySelector('a').focus();d.classList.add('shut');setTimeout(()=>d.classList.remove('shut'),300);}});
  });

  /* search */
  const sp=$('search'),si=$('searchInput'),sr=$('searchResults');
  const IDX=window.JECK_INDEX||[];
  function render(q){
    q=(q||'').trim().toLowerCase();
    const words=q.split(/\s+/).filter(Boolean);
    const hits=(words.length?IDX.filter(it=>words.every(w=>(it.t+' '+it.d+' '+it.k).toLowerCase().includes(w))):IDX.slice(0,8));
    sr.innerHTML=hits.length?hits.slice(0,12).map(it=>`<li><a href="${it.u}"><b>${it.t}</b><span>${it.d}</span></a></li>`).join(''):'<li><a href="contact.html"><b>No pages match that search</b><span>Try another word, or contact the school office.</span></a></li>';
  }
  if(sp){
    document.querySelectorAll('[data-search]').forEach(b=>b.addEventListener('click',()=>{sp.hidden=false;lock(true);render('');si.value='';setTimeout(()=>si.focus(),30);}));
    const shut=()=>{sp.hidden=true;lock(false);};
    $('searchClose').addEventListener('click',shut);
    sp.addEventListener('click',e=>{if(e.target===sp)shut();});
    si.addEventListener('input',()=>render(si.value));
    addEventListener('keydown',e=>{if(e.key==='Escape'&&!sp.hidden)shut();});
  }

  /* discreet WhatsApp form */
  const fab=$('waFab'),pop=$('waPop');
  if(fab&&pop){
    const openPop=topic=>{pop.hidden=false;fab.setAttribute('aria-expanded','true');if(topic){const sel=$('wa-topic');[...sel.options].forEach(o=>{if(o.text===topic)sel.value=o.value;});}$('waAlt').hidden=true;setTimeout(()=>$('wa-name').focus(),40);};
    const closePop=()=>{pop.hidden=true;fab.setAttribute('aria-expanded','false');};
    fab.addEventListener('click',()=>pop.hidden?openPop():closePop());
    $('waClose').addEventListener('click',closePop);
    addEventListener('keydown',e=>{if(e.key==='Escape'&&!pop.hidden){closePop();fab.focus();}});
    document.addEventListener('click',e=>{const a=e.target.closest('[data-wa]');if(a){e.preventDefault();openPop(a.dataset.wa);}});
    pop.addEventListener('submit',e=>{
      e.preventDefault();const f=new FormData(pop);
      const lines=['Hello JECK Comprehensive College,','',`My name is ${f.get('name')||''}. I am interested in ${f.get('topic')||'admission'}.`];
      if(f.get('message'))lines.push('',f.get('message'));
      const url='https://wa.me/2349130704152?text='+encodeURIComponent(lines.join('\n'));
      const alt=$('waAlt');alt.href=url;alt.hidden=false;
      const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
    });
  }

  /* back to top */
  const tt=$('toTop');tt&&tt.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));

  /* enquiry form: sends the message to the school on WhatsApp */
  const form=$('enquiry');
  if(form){
    form.addEventListener('submit',e=>{
      e.preventDefault();
      const f=new FormData(form);
      const lines=['Hello JECK Comprehensive College,','',`My name is ${f.get('name')||''}. I am enquiring about ${f.get('topic')||'admission'}${f.get('cls')?' for '+f.get('cls'):''}.`];
      if(f.get('message'))lines.push('',f.get('message'));
      if(f.get('phone'))lines.push('','Phone: '+f.get('phone'));
      if(f.get('email'))lines.push('Email: '+f.get('email'));
      const url='https://wa.me/2349130704152?text='+encodeURIComponent(lines.join('\n'));
      $('waGo').href=url;$('result').hidden=false;
      const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
    });
  }
})();
