document.addEventListener('DOMContentLoaded', function(){
    const $ = (sel,ctx)=> (ctx||document).querySelector(sel);
    const $$= (sel,ctx)=> [].slice.call((ctx||document).querySelectorAll(sel));

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
    let currentProduct = { images:[], index:0, name:'', priceText:'', price:0 };

    function updateHeaderUi(){
      if (!header) return;
      const scrolled = window.scrollY > 8;
      header.classList.toggle('is-scrolled', scrolled);
      document.documentElement.style.setProperty('--header-h', header.getBoundingClientRect().height + 'px');
    }

    function scrollToId(id){
      const el = $(id);
      if(!el || !header) return;
      const headerH = header.getBoundingClientRect().height;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - headerH - 6, behavior: 'smooth' });
    }
    
    function applyFilter(cat){
      filterPills.forEach(p => p.classList.toggle('is-active', p.dataset.cat === cat));
      prodCards.forEach(card => card.classList.toggle('hidden', !(cat === 'all' || card.dataset.cat === cat)));
      scrollToId('#productos');
    }

    function openModal(modalEl) { modalEl?.classList.add('open'); }
    function closeModal(modalEl) { modalEl?.classList.remove('open'); }
    
    const MU_LEGAL = {
        envios:{title:'Política de Envíos — MotoUrbano MX',body:'<p>Envíos a todo México mediante mensajería certificada. Tiempo estimado: <strong>10 a 20 días hábiles</strong> según tu zona.</p><p>Compartimos tu <strong>número de guía</strong> por correo para rastreo.</p><p>Si hay retrasos de paquetería, te acompañamos en todo momento.</p><p class="sub">Contacto: <a href="mailto:hola@motourbano.shop">hola@motourbano.shop</a></p>'},
        devoluciones:{title:'Política de Devoluciones — MotoUrbano MX',body:'<p>Tienes <strong>14 días naturales</strong> desde la entrega para solicitar devolución.</p><p>El producto debe estar <strong>sin uso</strong> y con empaques/etiquetas completos.</p><p>Escríbenos a <a href="mailto:hola@motourbano.shop">hola@motourbano.shop</a> o por WhatsApp con tu <strong>número de pedido</strong>.</p><p>Tras validar, hacemos reembolso por el mismo medio de pago.</p>'},
        privacidad:{title:'Aviso de Privacidad — MotoUrbano MX',body:'<p>Usamos tus datos para <strong>gestión de pedidos</strong>, atención y comunicaciones.</p><p>Compartimos lo mínimo con terceros (paquetería, pagos) o por obligación legal.</p><p>Derechos ARCO: <a href="mailto:hola@motourbano.shop">hola@motourbano.shop</a>.</p>'},
        terminos:{title:'Términos y Condiciones — MotoUrbano MX',body:'<p>El uso del sitio implica aceptación de estos términos. Precios y disponibilidad pueden cambiar.</p><p>Imágenes ilustrativas. Si hay error o falta de inventario, se puede cancelar con reembolso íntegro.</p><p>Dudas: <a href="mailto:hola@motourbano.shop">hola@motourbano.shop</a>.</p>'}
    };

    function MU_openLegal(key){
        const data = MU_LEGAL[key];
        if(!data) return;
        const modal = document.getElementById('legalModal');
        const body = document.getElementById('legalBody');
        const title = document.getElementById('legalTitle');
        if(!modal || !body || !title) return;
        title.textContent = data.title;
        body.innerHTML = `<div class="sub" style="text-align:left">${data.body}</div>`;
        modal.classList.add('open');
    }

    function MU_openMailModal(){
        const modal = document.getElementById('emailModal');
        if(modal) modal.classList.add('open');
    }

    function MU_copyEmail(){
        const email = 'hola@motourbano.shop';
        navigator.clipboard?.writeText(email);
        showToast('Correo copiado');
    }
    
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
    
    function showImageInModal(idx){
      if (!currentProduct.images.length) return;
      currentProduct.index = (idx + currentProduct.images.length) % currentProduct.images.length;
      const nextSrc = currentProduct.images[currentProduct.index];
      
      mMain.classList.add('is-loading');
      const img = new Image();
      img.src = nextSrc;
      img.onload = () => {
        mMain.src = nextSrc;
        mMain.alt = currentProduct.name;
        mMain.classList.remove('is-loading');
        $$('#mThumbs img').forEach(t => t.classList.toggle('active', t.src === nextSrc));
      };
    }
    
    function openProductModal(card){
      currentProduct = getProductData(card);
      mTitle.textContent = currentProduct.name || 'Producto';
      mPrice.textContent = currentProduct.priceText || '';
      mMain.src = currentProduct.mainImage;
      mMain.alt = currentProduct.name;
      mThumbs.innerHTML = currentProduct.images.map((src, i) =>
        `<img data-src="${src}" alt="Vista ${i + 1} de ${currentProduct.name}" loading="lazy" src="${src}" class="${i === 0 ? 'active' : ''}">`
      ).join('');
      mDesc.innerHTML = currentProduct.desc.map(li => `<li>${li}</li>`).join('');
      qInput.value = 1;
      openModal(modal);
      currentProduct.images.slice(1).forEach(src => { const img = new Image(); img.src = src; });
    }
    
    function openLightbox(src, alt){
      if (!lbImg || !lightbox) return;
      lbImg.src = src; lbImg.alt = alt || '';
      lightbox.classList.add('open');
    }

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

    prodCards.forEach(card => {
      let gallery = [];
      try { gallery = JSON.parse(card.dataset.gallery || '[]'); } catch(e) {}
      const secondImageSrc = gallery[0] || null;
      if (!secondImageSrc) return;
      const img = new Image();
      img.src = secondImageSrc;
      img.onload = () => {
          const wrap = card.querySelector('.img-wrap');
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

    window.addEventListener('scroll', updateHeaderUi, { passive: true });
    window.addEventListener('resize', updateHeaderUi);
    $$('.menu a[href^="#"]').forEach(a => a.addEventListener('click', function(e){
        e.preventDefault();
        const id = this.getAttribute('href');
        if (id && id.length > 1) scrollToId(id);
    }));

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

    document.body.addEventListener('click', e => {
      const card = e.target.closest('article.prod');
      if (card && grid.contains(card)) {
        openProductModal(card);
        return;
      }
      
      const cartButton = e.target.closest('#cartBtn');
      if(cartButton) {
        e.preventDefault();
        renderCart();
        openModal(cartModal);
        return;
      }

      const closeButton = e.target.closest('.close') || e.target.closest('.x');
      const modalToClose = closeButton?.closest('.modal, .lightbox');
      if(modalToClose) {
        closeModal(modalToClose);
        return;
      }

      const openModals = $$('.modal.open, .lightbox.open');
      openModals.forEach(modalEl => {
        if(e.target === modalEl) {
          closeModal(modalEl);
        }
      });
      
      const legalLink = e.target.closest('[data-legal]');
      if(legalLink) {
          e.preventDefault();
          MU_openLegal(legalLink.dataset.legal);
      }
      
      const emailLink = e.target.closest('[data-modal-target="emailModal"]');
      if(emailLink) {
          e.preventDefault();
          MU_openMailModal();
      }

      const copyEmailBtn = e.target.closest('[data-action="copy-email"]');
      if(copyEmailBtn) {
          e.preventDefault();
          MU_copyEmail();
      }
    });

    document.addEventListener('keydown', e => {
      if(e.key === 'Escape') {
        $$('.modal.open, .lightbox.open').forEach(el => closeModal(el));
      }
    });

    if (mThumbs) mThumbs.addEventListener('click', e => {
      const img = e.target.closest('img');
      if (img) showImageInModal(currentProduct.images.indexOf(img.getAttribute('data-src')));
    });

    if (mMain) mMain.addEventListener('click', () => openLightbox(mMain.src, mMain.alt));
    if (mPrev) mPrev.addEventListener('click', () => showImageInModal(currentProduct.index - 1));
    if (mNext) mNext.addEventListener('click', () => showImageInModal(currentProduct.index + 1));
    
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
      const found = items.find(it => it.name === currentProduct.name);
      if (found) found.qty += qty;
      else items.push({ name: currentProduct.name, price: currentProduct.price, img: currentProduct.mainImage, qty });
      writeCart(items);
      updateCartCount();
      renderCart();
      closeModal(modal);
      showToast('Añadido al carrito');
    });

    updateHeaderUi();
    updateCartCount();
    if(location.hash) setTimeout(() => scrollToId(location.hash), 50);

    prodCards.forEach(card => {
      let gallery = [];
      try { gallery = JSON.parse(card.dataset.gallery || '[]'); } catch(e) {}
      const secondImageSrc = gallery[0] || null;
      if (!secondImageSrc) return;
      const img = new Image();
      img.src = secondImageSrc;
      img.onload = () => {
          const wrap = card.querySelector('.img-wrap');
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
});
