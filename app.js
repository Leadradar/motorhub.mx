document.addEventListener('DOMContentLoaded', function(){
      const $ = (sel,ctx)=> (ctx||document).querySelector(sel);
      const $$= (sel,ctx)=> [].slice.call((ctx||document).querySelectorAll(sel));

      /* Header compacto + compensación */
      const header = $('#siteHeader');
      function updateHeaderUi(){
        if(!header) return;
        const sc=window.scrollY||window.pageYOffset;
        header.classList.toggle('is-scrolled', sc>8);
        const h=header.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--header-h', h+'px');
      }
      updateHeaderUi(); window.addEventListener('scroll', updateHeaderUi, {passive:true}); window.addEventListener('resize', updateHeaderUi);

      function scrollToId(id){
        const el=document.querySelector(id); if(!el||!header) return;
        const headerH=header.getBoundingClientRect().height;
        const y=el.getBoundingClientRect().top + window.pageYOffset - headerH - 6;
        window.scrollTo({top:y,behavior:'smooth'});
      }

      const y=$('#year'); if(y) y.textContent=new Date().getFullYear();

      /* Filtros */
      const filterPills=$$('#filters .pill');
      const prodCards=$$('#gridProds [data-cat]');
      function applyFilter(cat){
        filterPills.forEach(p=> p.classList.toggle('is-active', p.dataset.cat===cat));
        prodCards.forEach(card=> card.classList.toggle('hidden', !(cat==='all'||card.dataset.cat===cat)));
        scrollToId('#productos');
      }
      filterPills.forEach(p=> p.addEventListener('click', ()=> applyFilter(p.dataset.cat)));
      $$('.js-cat').forEach(tile=> tile.addEventListener('click', ()=> applyFilter(tile.dataset.cat)));

      /* ---- MODALES cerrar/abrir ---- */
      function attachClosable(modalSel, closeSel){
        const modal=$(modalSel); if(!modal) return;
        const closeBtn=$(closeSel); if(closeBtn) closeBtn.addEventListener('click', ()=> modal.classList.remove('open'));
        modal.addEventListener('click', (e)=>{ if(e.target===modal) modal.classList.remove('open'); });
      }
      attachClosable('#legalModal','#legalClose');
      attachClosable('#modal','#mClose');
      attachClosable('#cart','#cClose');
      attachClosable('#emailModal','#emailClose');

      document.addEventListener('keydown', function(e){
        if(e.key!=='Escape') return;
        ['#legalModal','#modal','#cart','#lightbox','#emailModal'].forEach(sel=>{
          const el=$(sel); if(el && el.classList.contains('open')) el.classList.remove('open');
        });
      });

      /* ===== Modal producto ===== */
      const modal=$('#modal'), mTitle=$('#mTitle'), mPrice=$('#mPrice'),
            mMain=$('#mMain'), mThumbs=$('#mThumbs'),
            mPrev=$('#mPrev'), mNext=$('#mNext'),
            qMinus=$('#qMinus'), qPlus=$('#qPlus'), qInput=$('#qInput'),
            mAdd=$('#mAdd'), mDesc=$('#mDesc');

      const lightbox=$('#lightbox'), lbImg=$('#lbImg'), lbClose=$('#lbClose'), lbPrev=$('#lbPrev'), lbNext=$('#lbNext');

      const toast=$('#toast'); let current={images:[],index:0,name:'',priceText:'',price:0};

      function bullets(text){ return (text||'').split('·').map(s=>s.trim()).filter(Boolean); }
      function setActiveThumb(){ $$('#mThumbs img').forEach(t=> t.classList.toggle('active', t.dataset.src===mMain.dataset.src)); }
      function showImage(idx){
        if(!current.images.length) return;
        current.index=(idx+current.images.length)%current.images.length;
        const nextSrc=current.images[current.index];
        mMain.classList.add('is-loading');
        const im=new Image(); im.decoding='async';
        im.onload=function(){ mMain.src=nextSrc; mMain.dataset.src=nextSrc; mMain.alt=current.name; mMain.classList.remove('is-loading'); setActiveThumb(); };
        im.src=nextSrc;
      }
      function openModal(card){
        let gallery=[]; try{ gallery=JSON.parse(card.getAttribute('data-gallery')||'[]'); }catch(e){ gallery=[]; }
        current={ name:card.dataset.name, priceText:card.dataset.price, price:parseInt((card.dataset.price||'').replace(/[^0-9]/g,''),10)||0, main:card.getAttribute('data-main')||'', images:[], index:0 };
        current.images=[current.main].concat(gallery.filter(Boolean));
        if(mTitle) mTitle.textContent=current.name||'Producto';
        if(mPrice) mPrice.textContent=current.priceText||'';
        if(mMain){ mMain.classList.remove('is-loading'); mMain.src=current.images[0]; mMain.dataset.src=current.images[0]; mMain.alt=current.name; }
        if(mThumbs) mThumbs.innerHTML=current.images.map((src,i)=> `<img data-src="${src}" alt="Vista ${i+1} ${current.name}" loading="lazy" decoding="async" src="${src}">`).join('');
        setActiveThumb();

        if(mThumbs) mThumbs.onclick=function(e){
          const img=e.target.closest('img'); if(!img) return;
          const idx=current.images.indexOf(img.getAttribute('data-src'));
          if(idx>-1){ showImage(idx); }
        };
        if(mMain) mMain.onclick=function(){ openLightbox(mMain.src, mMain.alt); };

        if(mPrev) mPrev.onclick=function(){ showImage(current.index-1); };
        if(mNext) mNext.onclick=function(){ showImage(current.index+1); };

        // Swipe móvil
        let sx=0,sy=0,dx=0,dy=0;
        if(mMain){
          mMain.addEventListener('touchstart',function(ev){ if(ev.touches.length!==1)return; sx=ev.touches[0].clientX; sy=ev.touches[0].clientY; },{passive:true});
          mMain.addEventListener('touchmove',function(ev){ if(ev.touches.length!==1)return; dx=ev.touches[0].clientX-sx; dy=ev.touches[0].clientY-sy; },{passive:true});
          mMain.addEventListener('touchend',function(){ if(Math.abs(dx)>40 && Math.abs(dy)<40){ if(dx<0)showImage(current.index+1); else showImage(current.index-1);} dx=dy=0; },{passive:true});
        }

        if(mDesc) mDesc.innerHTML=bullets(card.dataset.desc||'').map(li=> '<li>'+li+'</li>').join('');
        if(qInput) qInput.value=1;
        if(modal) modal.classList.add('open');

        // Prefetch silencioso
        current.images.slice(1).forEach(src=>{ const i=new Image(); i.decoding='async'; i.onload=()=>{ /* no-op */ }; i.src=src; });
      }

      /* Lightbox */
      function openLightbox(src,alt){ if(!lbImg||!lightbox) return; lbImg.src=src; lbImg.alt=alt||''; scale=1; tx=0; ty=0; applyTransform(); lightbox.classList.add('open'); }
      function closeLightbox(){ if(lightbox) lightbox.classList.remove('open'); }
      if(lbClose) lbClose.addEventListener('click', closeLightbox);
      if(lbPrev)  lbPrev .addEventListener('click', function(){ showImage(current.index-1); lbImg.src=current.images[current.index]; });
      if(lbNext)  lbNext .addEventListener('click', function(){ showImage(current.index+1); lbImg.src=current.images[current.index]; });
      if(lightbox) lightbox.addEventListener('click', function(e){ if(e.target===lightbox) closeLightbox(); });

      let scale=1, tx=0, ty=0;
      function applyTransform(){ if(lbImg) lbImg.style.transform='translate('+tx+'px,'+ty+'px) scale('+scale+')'; }
      if(lightbox) lightbox.addEventListener('wheel', function(e){ e.preventDefault(); const d=e.deltaY>0?-0.1:0.1; scale=Math.max(1,Math.min(5,scale+d)); applyTransform(); }, {passive:false});
      let startDist=0,startScale=1,startX=0,startY=0;
      if(lightbox) lightbox.addEventListener('touchstart', function(e){
        if(e.touches.length===2){ startDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); startScale=scale; }
        else if(e.touches.length===1){ startX=e.touches[0].clientX-tx; startY=e.touches[0].clientY-ty; }
      }, {passive:true});
      if(lightbox) lightbox.addEventListener('touchmove', function(e){
        if(e.touches.length===2){
          const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
          scale=Math.max(1,Math.min(5,startScale*(d/startDist))); applyTransform();
        }else if(e.touches.length===1 && scale>1){
          tx=e.touches[0].clientX-startX; ty=e.touches[0].clientY-startY; applyTransform();
        }
      }, {passive:true});
      let lastTap=0; if(lightbox) lightbox.addEventListener('touchend', function(){ const now=Date.now(); if(now-lastTap<300){ scale=1; tx=0; ty=0; applyTransform(); } lastTap=now; });

      /* Carrito */
      const cartBtn=$('#cartBtn'), cartModal=$('#cart'), cClose=$('#cClose'),
            cBody=$('#cBody'), cTotal=$('#cTotal'), cClear=$('#cClear'),
            ppAmount=$('#ppAmount'), ppBusiness=$('#ppBusiness']);
      const PAYPAL_BUSINESS='tu-correo-paypal@ejemplo.com'; if(ppBusiness) ppBusiness.value=PAYPAL_BUSINESS;

      const STORAGE_KEY='mu_cart';
      const readCart =()=>{ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); }catch(e){ return []; } };
      const writeCart=(items)=> localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      const cartSum =(items)=> items.reduce((s,i)=> s+i.price*i.qty,0);
      function updateCount(){ const items=readCart(); const n=items.reduce((s,i)=>s+i.qty,0); const cc=$('#cartCount'); if(cc) cc.textContent=n; }

      function renderCart(){
        const items=readCart();
        if(cBody){
          if(items.length===0){
            cBody.innerHTML='<p class="sub">Tu carrito está vacío.</p>';
          }else{
            cBody.innerHTML=items.map((i,idx)=>`
              <div class="cart-item">
                <img src="${i.img}" alt="${i.name}" loading="lazy" decoding="async">
                <div><div style="font-weight:700">${i.name}</div><div class="sub">$${i.price} MXN c/u</div></div>
                <div style="display:flex;align-items:center;gap:8px">
                  <div class="qtyline">
                    <button type="button" data-act="minus" data-idx="${idx}" aria-label="Quitar uno">−</button>
                    <input type="number" min="1" value="${i.qty}" data-idx="${idx}" data-act="input" />
                    <button type="button" data-act="plus" data-idx="${idx}" aria-label="Añadir uno">+</button>
                  </div>
                  <button class="close" type="button" data-del="${idx}">Eliminar</button>
                </div>
              </div>`).join('');
          }
        }
        const total=cartSum(items);
        if(cTotal) cTotal.textContent='$'+total+' MXN';
        if(ppAmount) ppAmount.value=Number(total).toFixed(2);
      }
      function openCart(){ renderCart(); if(cartModal) cartModal.classList.add('open'); }
      function closeCart(){ if(cartModal) cartModal.classList.remove('open'); }
      if(cartBtn) cartBtn.addEventListener('click', function(e){ e.preventDefault(); openCart(); });

      if(cBody) cBody.addEventListener('click', function(e){
        const del=e.target.closest('[data-del]');
        if(del){ const idx=parseInt(del.dataset.del,10); const items=readCart(); items.splice(idx,1); writeCart(items); updateCount(); renderCart(); return; }
        const act=e.target.closest('button[data-act]');
        if(act){ const idx=parseInt(act.dataset.idx,10); const items=readCart(); if(!items[idx]) return;
          if(act.dataset.act==='minus'){ items[idx].qty=Math.max(1,(items[idx].qty||1)-1); }
          if(act.dataset.act==='plus'){ items[idx].qty=(items[idx].qty||1)+1; }
          writeCart(items); updateCount(); renderCart();
        }
      });
      if(cBody) cBody.addEventListener('change', function(e){
        const inp=e.target.closest('input[data-act="input"]'); if(!inp) return;
        const idx=parseInt(inp.dataset.idx,10); const items=readCart(); if(!items[idx]) return;
        const v=Math.max(1, parseInt(inp.value,10)||1); items[idx].qty=v; writeCart(items); updateCount(); renderCart();
      });
      if(cClear) cClear.addEventListener('click', function(){ writeCart([]); updateCount(); renderCart(); });

      function showToast(txt){ const t=$('#toast'); if(!t) return; if(txt) t.textContent=txt; t.style.opacity='1'; t.style.transform='translateX(-50%) translateY(-6px)'; setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(-50%)'; t.textContent='Añadido al carrito'; }, 1400); }
      if(mAdd) mAdd.addEventListener('click', function(){
        const qty=Math.max(1, parseInt(qInput.value,10)||1);
        const items=readCart(); const name=mTitle.textContent;
        const price=parseInt((mPrice.textContent||'').replace(/[^0-9]/g,''),10)||0; const img=mMain.src;
        const found=items.find(it=> it.name===name && it.img===img && it.price===price);
        if(found){ found.qty+=qty; } else { items.push({name,price,img,qty}); }
        writeCart(items); updateCount(); openCart(); if(modal) modal.classList.remove('open'); showToast();
      });

      /* Menú anclas con compensación */
      $$('.menu a[href^="#"]').forEach(a=>{
        a.addEventListener('click', function(e){ e.preventDefault(); const id=a.getAttribute('href'); if(id && id.length>1){ scrollToId(id); } });
      });

      /* Prefetch + HOVER seguro: crear hover-img y marcar .ready cuando la 2ª imagen haya cargado */
      const grid = $('#gridProds');
      $$('#gridProds article.prod').forEach(function(card){
        let g=[]; try{ g=JSON.parse(card.getAttribute('data-gallery')||'[]'); }catch(e){ g=[]; }
        const wrap = card.querySelector('.img-wrap');
        const base = card.querySelector('.base-img');
        const second = (g && g[0]) ? g[0] : null;
        if(wrap && base && second){
          const h = document.createElement('img');
          h.className='hover-img';
          h.alt=(card.dataset.name||'')+' vista';
          h.loading='lazy'; h.decoding='async';
          h.style.opacity='0';
          h.addEventListener('load', ()=> { card.classList.add('ready'); });
          h.src=second;
          wrap.appendChild(h);
        }
      });

      /* Delegación de CLICK para abrir modal */
      if(grid){
        grid.addEventListener('click', function(e){
          const card = e.target.closest('article.prod');
          if(!card || !grid.contains(card)) return;
          openModal(card);
        });
      }

      /* PayPal email */
      const ppBusinessEl=$('#ppBusiness'); if(ppBusinessEl) ppBusinessEl.value='tu-correo-paypal@ejemplo.com';

      /* Init */
      updateHeaderUi();
      if(location.hash){ setTimeout(()=>{ scrollToId(location.hash); }, 50); }
      try{
        const items=JSON.parse(localStorage.getItem('mu_cart')||'[]');
        const n=items.reduce((s,i)=>s+i.qty,0);
        const cc=$('#cartCount'); if(cc) cc.textContent=n;
      }catch(_){ const cc=$('#cartCount'); if(cc) cc.textContent='0'; }
    });
