document.addEventListener('DOMContentLoaded', function(){
    const $ = (sel,ctx)=> (ctx||document).querySelector(sel);
    const $$= (sel,ctx)=> [].slice.call((ctx||document).querySelectorAll(sel));
    
    // Almacenamos las referencias de los elementos del DOM una sola vez
    const header = $('#siteHeader');
    const prodCards = $$('#gridProds article.prod');
    const filterPills = $$('#filters .pill');
    const grid = $('#gridProds');
    const cartBtn = $('#cartBtn');
    
    const modal = $('#modal'), mTitle = $('#mTitle'), mPrice = $('#mPrice'),
          mMain = $('#mMain'), mThumbs = $('#mThumbs'), mDesc = $('#mDesc'),
          mPrev = $('#mPrev'), mNext = $('#mNext'),
          qMinus = $('#qMinus'), qPlus = $('#qPlus'), qInput = $('#qInput'),
          mAdd = $('#mAdd');
    
    const cartModal = $('#cart'), cBody = $('#cBody'), cTotal = $('#cTotal'), cClear = $('#cClear'),
          ppAmount = $('#ppAmount'), ppBusiness = $('#ppBusiness']);
    
    const lightbox = $('#lightbox'), lbImg = $('#lbImg'), lbClose = $('#lbClose'),
          lbPrev = $('#lbPrev'), lbNext = $('#lbNext');
    
    const toast = $('#toast');
    
    let current = { images:[], index:0, name:'', priceText:'', price:0 };

    /* --- Funcionalidades de UI/UX --- */
    function updateHeaderUi(){
      if (!header) return;
      const scrolled = window.scrollY > 8;
      header.classList.toggle('is-scrolled', scrolled);
      document.documentElement.style.setProperty('--header-h', header.getBoundingClientRect().height + 'px');
    }
    updateHeaderUi();
    window.addEventListener('scroll', updateHeaderUi, { passive: true });
    window.addEventListener('resize', updateHeaderUi);
    
    function scrollToId(id){
      const el = $(id);
      if(!el || !header) return;
      const headerH = header.getBoundingClientRect().height;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - headerH - 6, behavior: 'smooth' });
    }
    
    $$('.menu a[href^="#"]').forEach(a => a.addEventListener('click', function(e){
      e.preventDefault();
      const id = this.getAttribute('href');
      if (id && id.length > 1) scrollToId(id);
    }));

    function applyFilter(cat){
      filterPills.forEach(p => p.classList.toggle('is-active', p.dataset.cat === cat));
      prodCards.forEach(card => card.classList.toggle('hidden', !(cat === 'all' || card.dataset.cat === cat)));
      scrollToId('#productos');
    }
    
    const filtersContainer = $('#filters');
    if (filtersContainer) filtersContainer.addEventListener('click', e => {
      const pill = e.target.closest('.pill');
      if (pill) applyFilter(pill.dataset.cat);
    });
    
    const categoriesContainer = $('.grid.cols-2.cols-5');
    if (categoriesContainer) categoriesContainer.addEventListener('click', e => {
      const tile = e.target.closest('.js-cat');
      if (tile) applyFilter(tile.dataset.cat);
    });
    
    // Nueva y más robusta forma de cerrar modales
    const modalElements = $$('.modal, .lightbox');
    const closeButtons = $$('.modal .close, .lightbox .x');
    
    modalElements.forEach(modalEl => {
      modalEl.addEventListener('click', e => {
        if (e.target === modalEl) {
          modalEl.classList.remove('open');
        }
      });
    });

    closeButtons.forEach(btn => {
        btn.addEventListener('click', e => {
            const modalToClose = e.target.closest('.modal, .lightbox');
            if (modalToClose) {
                modalToClose.classList.remove('open');
            }
        });
    });

    document.addEventListener('keydown', e => {
      if(e.key === 'Escape') {
        $$('.modal.open, .lightbox.open').forEach(el => el.classList.remove('open'));
      }
    });
    
    const yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* --- Lógica del Modal de Producto --- */
    function getProductData(card){
      const name = card.dataset.name;
      const priceText = card.dataset.price;
      const price = parseInt((priceText || '').replace(/[^0-9]/g, ''), 10) || 0;
      const mainImage = card.dataset.main || '';
      let gallery = [];
      try { gallery = JSON.parse(card.dataset.gallery || '[]'); } catch(e) {}
      const images = [mainImage].concat(gallery.filter(Boolean));
      const desc = (card.dataset.desc || '').split('·').map(s => s.trim()).filter(Boolean);
      return { name, priceText, price, mainImage, images, desc };
    }
    
    function showImage(idx){
      if (!current.images.length) return;
      current.index = (idx + current.images.length) % current.images.length;
      const nextSrc = current.images[current.index];
      mMain.classList.add('is-loading');
      const img = new Image();
      img.src = nextSrc;
      img.onload = () => {
        mMain.src = nextSrc;
        mMain.alt = current.name;
        mMain.classList.remove('is-loading');
        $$('#mThumbs img').forEach(t => t.classList.toggle('active', t.src === nextSrc));
      };
    }
    
    function openProductModal(card){
      current = getProductData(card);
      mTitle.textContent = current.name || 'Producto';
      mPrice.textContent = current.priceText || '';
      mMain.src = current.mainImage;
      mMain.alt = current.name;
      mThumbs.innerHTML = current.images.map((src, i) =>
        `<img data-src="${src}" alt="Vista ${i + 1} de ${current.name}" loading="lazy" src="${src}" class="${i === 0 ? 'active' : ''}">`
      ).join('');
      mDesc.innerHTML = current.desc.map(li => `<li>${li}</li>`).join('');
      qInput.value = 1;
      
      mThumbs.onclick = e => {
        const img = e.target.closest('img');
        if (img) showImage(current.images.indexOf(img.getAttribute('data-src')));
      };
      mMain.onclick = () => openLightbox(mMain.src, mMain.alt);
      mPrev.onclick = () => showImage(current.index - 1);
      mNext.onclick = () => showImage(current.index + 1);
      
      modal.classList.add('open');
      current.images.slice(1).forEach(src => { const img = new Image(); img.src = src; });
    }
    
    if (grid) grid.addEventListener('click', e => {
      const card = e.target.closest('article.prod');
      if (card) openProductModal(card);
    });

    /* --- Lógica del Lightbox (zoom) --- */
    let scale = 1, tx = 0, ty = 0;
    function applyTransform() {
      if (lbImg) lbImg.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    }
    function openLightbox(src, alt){
      if (!lbImg || !lightbox) return;
      lbImg.src = src; lbImg.alt = alt || '';
      scale = 1; tx = 0; ty = 0;
      applyTransform();
      lightbox.classList.add('open');
    }
    
    if(lbPrev) lbPrev.addEventListener('click', () => { showImage(current.index - 1); openLightbox(mMain.src, mMain.alt); });
    if(lbNext) lbNext.addEventListener('click', () => { showImage(current.index + 1); openLightbox(mMain.src, mMain.alt); });
    
    if(lightbox) {
        lightbox.addEventListener('wheel', e => { e.preventDefault(); const delta = e.deltaY > 0 ? -0.1 : 0.1; scale = Math.max(1, Math.min(5, scale + delta)); applyTransform(); }, { passive: false });
        let startDist = 0, startScale = 1, startX = 0, startY = 0;
        lightbox.addEventListener('touchstart', e => {
          if(e.touches.length === 2){ startDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); startScale = scale; }
          else if (e.touches.length === 1){ startX = e.touches[0].clientX - tx; startY = e.touches[0].clientY - ty; }
        }, { passive: true });
        lightbox.addEventListener('touchmove', e => {
          if(e.touches.length === 2){ const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); scale = Math.max(1, Math.min(5, startScale * (dist / startDist))); applyTransform(); }
          else if (e.touches.length === 1 && scale > 1){ tx = e.touches[0].clientX - startX; ty = e.touches[0].clientY - startY; applyTransform(); }
        }, { passive: true });
        let lastTap = 0;
        lightbox.addEventListener('touchend', () => { const now = Date.now(); if (now - lastTap < 300) { scale = 1; tx = 0; ty = 0; applyTransform(); } lastTap = now; });
    }
    
    /* --- Lógica del Carrito --- */
    const STORAGE_KEY = 'mu_cart';
    const readCart = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e) { return []; } };
    const writeCart = items => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    const cartSum = items => items.reduce((s, i) => s + i.price * i.qty, 0);
    
    function updateCartCount(){
      const count = readCart().reduce((s, i) => s + i.qty, 0);
      $('#cartCount').textContent = count;
    }
    
    function renderCart(){
      const items = readCart();
      const emptyCartHTML = '<p class="sub">Tu carrito está vacío.</p>';
      if(cBody){
        cBody.innerHTML = items.length === 0
          ? emptyCartHTML
          : items.map((i, idx) => `
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
              </div>`
          ).join('');
      }
      const total = cartSum(items);
      if(cTotal) cTotal.textContent = `$${total} MXN`;
      if(ppAmount) ppAmount.value = Number(total).toFixed(2);
      if(ppBusiness) ppBusiness.value = 'tu-correo-paypal@ejemplo.com';
    }
    
    cartBtn?.addEventListener('click', e => { e.preventDefault(); renderCart(); cartModal?.classList.add('open'); });
    cClear?.addEventListener('click', () => { writeCart([]); updateCartCount(); renderCart(); });
    
    if(cBody){
        cBody.addEventListener('click', e => {
            const btn = e.target.closest('button[data-act], button[data-del]');
            if (!btn) return;
            const idx = parseInt(btn.dataset.idx || btn.dataset.del, 10);
            const items = readCart();
            if (!items[idx]) return;
            if (btn.dataset.act === 'minus') items[idx].qty = Math.max(1, items[idx].qty - 1);
            else if (btn.dataset.act === 'plus') items[idx].qty = items[idx].qty + 1;
            else if (btn.dataset.del) items.splice(idx, 1);
            writeCart(items);
            updateCartCount();
            renderCart();
        });
        cBody.addEventListener('change', e => {
            const input = e.target.closest('input[data-act="input"]');
            if (!input) return;
            const idx = parseInt(input.dataset.idx, 10);
            const items = readCart();
            if (!items[idx]) return;
            items[idx].qty = Math.max(1, parseInt(input.value, 10) || 1);
            writeCart(items);
            updateCartCount();
            renderCart();
        });
    }
    
    if (mAdd) mAdd.addEventListener('click', () => {
      const qty = Math.max(1, parseInt(qInput.value, 10) || 1);
      const items = readCart();
      const found = items.find(it => it.name === current.name);
      if (found) found.qty += qty;
      else items.push({ name: current.name, price: current.price, img: current.mainImage, qty });
      writeCart(items);
      updateCartCount();
      renderCart();
      modal?.classList.remove('open');
      showToast('Añadido al carrito');
    });
    
    function showToast(txt){
      if(!toast) return;
      if(txt) toast.textContent = txt;
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(-6px)';
      setTimeout(()=>{
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%)';
      }, 1400);
    }
    
    updateCartCount();

    /* --- Lógica de la imagen secundaria al hacer hover --- */
    prodCards.forEach(card => {
        let gallery = [];
        try { gallery = JSON.parse(card.dataset.gallery || '[]'); } catch(e) {}
        const wrap = card.querySelector('.img-wrap');
        const secondImageSrc = gallery[0] || null;
        if (!wrap || !secondImageSrc) return;
        const imgHover = new Image();
        imgHover.src = secondImageSrc;
        imgHover.onload = () => {
            const h = document.createElement('img');
            h.className='hover-img';
            h.alt=(card.dataset.name||'')+' vista';
            h.loading='lazy'; h.decoding='async';
            h.src=secondImageSrc;
            const existingHoverImg = wrap.querySelector('.hover-img');
            if(existingHoverImg) wrap.removeChild(existingHoverImg);
            wrap.appendChild(h);
            card.classList.add('ready');
        };
    });

    if(location.hash) setTimeout(() => scrollToId(location.hash), 50);
});
