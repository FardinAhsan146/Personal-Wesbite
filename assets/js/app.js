document.addEventListener('DOMContentLoaded', () => {
  renderNav(siteData.navigation);
  renderHero(siteData.about);
  renderPhotos(siteData.about.photos);
  renderProjects(siteData.projects);
  renderWriting(siteData.writing);
  renderContact(siteData.contact);
  renderFooter(siteData.social, siteData.site);
  initScrollReveal();
  initMobileNav();
  initSmoothScroll();
  initNavScroll();
  initPhotosDrag();
  initCursorGlow();
  initCountUp();
  initProjectCardHover();
});

// Navigation
function renderNav(items) {
  const nav = document.getElementById('main-nav');
  items.forEach(item => {
    const a = document.createElement('a');
    a.href = item.url;
    a.textContent = item.name;
    nav.appendChild(a);
  });
}

// Hero
function renderHero(about) {
  document.getElementById('hero-bio').innerHTML = about.description.replace(/\n/g, '<br>');
}

// Photo sections - grouped by category
function renderPhotos(photos) {
  // Mountains group
  const mountainGrid = document.getElementById('mountain-photos');
  const motorGrid = document.getElementById('motor-photos');

  photos.forEach(photo => {
    const card = document.createElement('div');
    card.className = 'photo-card reveal';

    const img = document.createElement('img');
    img.src = photo.image;
    img.alt = photo.title;
    img.loading = 'lazy';

    card.appendChild(img);

    if (photo.caption || photo.location) {
      const overlay = document.createElement('div');
      overlay.className = 'photo-overlay';
      overlay.innerHTML = `
        ${photo.location ? `<span class="photo-location"><i class="fas fa-map-marker-alt"></i> ${photo.location}</span>` : ''}
        ${photo.caption ? `<span class="photo-caption">${photo.caption}</span>` : ''}
      `;
      card.appendChild(overlay);
    }

    if (photo.group === 'mountains') {
      mountainGrid.appendChild(card);
    } else {
      motorGrid.appendChild(card);
    }
  });
}

// Projects
function renderProjects(data) {
  document.getElementById('projects-desc').innerHTML = data.description;
  const grid = document.getElementById('projects-grid');

  data.items.forEach(project => {
    const card = document.createElement('div');
    card.className = 'project-card reveal';

    const inner = document.createElement('div');
    inner.className = 'project-card-inner';

    const info = document.createElement('div');
    info.className = 'project-info';

    const title = document.createElement('h3');
    title.textContent = project.title;

    const desc = document.createElement('p');
    desc.className = 'project-desc';
    desc.textContent = project.description;

    const features = document.createElement('ul');
    features.className = 'project-features';
    project.features.forEach(f => {
      const li = document.createElement('li');
      li.textContent = f;
      features.appendChild(li);
    });

    info.appendChild(title);
    info.appendChild(desc);
    info.appendChild(features);

    if (project.use_case) {
      const useCase = document.createElement('p');
      useCase.className = 'project-use-case';
      useCase.innerHTML = project.use_case;
      info.appendChild(useCase);
    }

    const links = document.createElement('div');
    links.className = 'project-links';
    if (project.github) {
      const ghLink = document.createElement('a');
      ghLink.href = project.github;
      ghLink.target = '_blank';
      ghLink.className = 'btn btn-sm btn-ghost';
      ghLink.innerHTML = '<i class="fab fa-github"></i> GitHub';
      links.appendChild(ghLink);
    }
    info.appendChild(links);

    const demo = document.createElement('div');
    demo.className = 'project-demo';
    const img = document.createElement('img');
    img.src = project.image;
    img.alt = project.title;
    img.loading = 'lazy';
    demo.appendChild(img);

    inner.appendChild(info);
    inner.appendChild(demo);
    card.appendChild(inner);
    grid.appendChild(card);
  });
}

// Writing
function renderWriting(data) {
  document.getElementById('writing-desc').textContent = data.description;
  const grid = document.getElementById('writing-grid');

  data.posts.forEach(post => {
    const card = document.createElement('div');
    card.className = 'writing-card reveal';

    const title = document.createElement('h3');
    title.textContent = post.title;

    const excerpt = document.createElement('p');
    excerpt.className = 'writing-excerpt';
    excerpt.textContent = post.description;

    const link = document.createElement('a');
    link.href = post.url;
    link.target = '_blank';
    link.className = 'writing-link';
    link.innerHTML = 'Read on Substack <i class="fas fa-arrow-right"></i>';

    card.appendChild(title);
    card.appendChild(excerpt);
    card.appendChild(link);
    grid.appendChild(card);
  });
}

// Contact
function renderContact(data) {
  const grid = document.getElementById('contact-grid');

  data.items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'contact-item reveal';

    const icon = document.createElement('div');
    icon.className = 'contact-icon';
    icon.innerHTML = `<i class="${item.icon}"></i>`;

    const details = document.createElement('div');
    details.className = 'contact-details';

    const h3 = document.createElement('h3');
    h3.textContent = item.title;

    const a = document.createElement('a');
    a.href = item.url;
    a.textContent = item.text;
    if (item.url.startsWith('http')) a.target = '_blank';

    details.appendChild(h3);
    details.appendChild(a);
    el.appendChild(icon);
    el.appendChild(details);
    grid.appendChild(el);
  });
}

// Footer
function renderFooter(social, site) {
  const links = document.getElementById('footer-links');
  social.forEach(item => {
    const a = document.createElement('a');
    a.href = item.url;
    a.target = '_blank';
    a.setAttribute('aria-label', item.platform);
    a.innerHTML = `<i class="${item.icon}"></i>`;
    links.appendChild(a);
  });
  document.getElementById('footer-copy').textContent = site.copyright;
  const tagline = document.getElementById('footer-tagline');
  if (tagline) tagline.textContent = site.tagline;
}

// Scroll reveal with stagger
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// Mobile nav toggle
function initMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('main-nav');

  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
    toggle.classList.toggle('active');
  });

  links.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      links.classList.remove('open');
      toggle.classList.remove('active');
    }
  });
}

// Smooth scroll with offset
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        const offset = 90;
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

// Nav scroll effect
function initNavScroll() {
  const nav = document.getElementById('nav');
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        nav.classList.toggle('scrolled', window.scrollY > 60);
        ticking = false;
      });
      ticking = true;
    }
  });
}

// Horizontal drag scroll
function initPhotosDrag() {
  document.querySelectorAll('.photos-scroll').forEach(slider => {
    let isDown = false;
    let startX;
    let scrollLeft;

    slider.addEventListener('mousedown', (e) => {
      isDown = true;
      slider.style.cursor = 'grabbing';
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    });

    slider.addEventListener('mouseleave', () => {
      isDown = false;
      slider.style.cursor = 'grab';
    });

    slider.addEventListener('mouseup', () => {
      isDown = false;
      slider.style.cursor = 'grab';
    });

    slider.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.8;
      slider.scrollLeft = scrollLeft - walk;
    });
  });
}

// Cursor glow that follows mouse
function initCursorGlow() {
  const glow = document.getElementById('cursor-glow');
  if (!glow || window.innerWidth < 768) return;

  let mouseX = 0, mouseY = 0;
  let glowX = 0, glowY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    glow.classList.add('active');
  });

  document.addEventListener('mouseleave', () => {
    glow.classList.remove('active');
  });

  function animate() {
    glowX += (mouseX - glowX) * 0.08;
    glowY += (mouseY - glowY) * 0.08;
    glow.style.left = glowX + 'px';
    glow.style.top = glowY + 'px';
    requestAnimationFrame(animate);
  }
  animate();
}

// Count-up animation for stats
function initCountUp() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-count'));
        let current = 0;
        const step = Math.max(1, Math.floor(target / 30));
        const interval = setInterval(() => {
          current += step;
          if (current >= target) {
            current = target;
            clearInterval(interval);
          }
          el.textContent = current;
        }, 40);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-count]').forEach(el => observer.observe(el));
}

// Project card mouse-follow glow
function initProjectCardHover() {
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mouse-x', x + '%');
      card.style.setProperty('--mouse-y', y + '%');
    });
  });
}
