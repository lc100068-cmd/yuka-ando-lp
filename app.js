const chapters = [...document.querySelectorAll('.chapter')];
const links = [...document.querySelectorAll('[data-chapter-link]')];
const counter = document.querySelector('[data-current-page]');
const progress = document.querySelector('#progress-bar');
const contents = document.querySelector('#contents-dialog');
const viewer = document.querySelector('#image-viewer');
const viewerImage = document.querySelector('#viewer-image');
const viewerScroll = document.querySelector('#viewer-scroll');
const viewerTitle = document.querySelector('#viewer-title');
const fitButton = document.querySelector('#viewer-fit');
let currentPage = 1;
let updateQueued = false;
let returnFocus = null;

// Motion is a progressive enhancement: without it, every page stays readable.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const bridges = [...document.querySelectorAll('[data-reveal]')];
let revealObserver;
let bridgeObserver;

function configureMotion() {
  revealObserver?.disconnect();
  bridgeObserver?.disconnect();
  const targets = [...chapters, ...bridges];
  if (motionPreference.matches || !('IntersectionObserver' in window)) {
    document.documentElement.classList.remove('motion-enabled');
    targets.forEach(target => target.classList.remove('reveal-ready', 'is-visible', 'is-active'));
    return;
  }

  document.documentElement.classList.add('motion-enabled');
  revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  }, { threshold: 0, rootMargin: '0px 0px -36px 0px' });

  for (const target of targets) {
    // Do not animate text the visitor is already reading or hide it on reload.
    if (target.getBoundingClientRect().top < window.innerHeight) {
      target.classList.add('is-visible');
    } else {
      target.classList.add('reveal-ready');
      revealObserver.observe(target);
    }
  }

  bridgeObserver = new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.classList.toggle('is-active', entry.isIntersecting);
  });
  bridges.forEach(bridge => bridgeObserver.observe(bridge));
}

configureMotion();
motionPreference.addEventListener('change', configureMotion);

function updateReadingPosition() {
  updateQueued = false;
  const readingLine = Math.min(window.innerHeight * .35, 300);
  let page = 1;
  for (const chapter of chapters) {
    if (chapter.getBoundingClientRect().top <= readingLine) page = Number(chapter.dataset.page);
  }
  if (page !== currentPage) {
    currentPage = page;
    counter.textContent = String(page);
    for (const link of links) {
      if (Number(link.dataset.chapterLink) === page) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
  const start = chapters[0].getBoundingClientRect().top + window.scrollY;
  const end = chapters.at(-1).getBoundingClientRect().bottom + window.scrollY;
  const range = end - start - window.innerHeight;
  const fraction = range > 0 ? Math.max(0, Math.min(1, (window.scrollY - start) / range)) : 1;
  progress.style.transform = `scaleX(${fraction})`;
}

function queueReadingUpdate() {
  if (!updateQueued) {
    updateQueued = true;
    requestAnimationFrame(updateReadingPosition);
  }
}

window.addEventListener('scroll', queueReadingUpdate, { passive: true });
window.addEventListener('resize', queueReadingUpdate, { passive: true });
window.addEventListener('pageshow', queueReadingUpdate);
updateReadingPosition();

function openDialog(dialog, trigger) {
  returnFocus = trigger;
  dialog.showModal();
  document.body.classList.add('modal-open');
}

function closeDialog(dialog) {
  dialog.close();
}

for (const dialog of [contents, viewer]) {
  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    returnFocus?.focus({ preventScroll: true });
    returnFocus = null;
    queueReadingUpdate();
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog && dialog === contents) {
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog(dialog);
    }
  });
}

document.querySelector('#contents-open').addEventListener('click', event => openDialog(contents, event.currentTarget));
document.querySelector('#contents-close').addEventListener('click', () => closeDialog(contents));
contents.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeDialog(contents)));

document.querySelectorAll('[data-enlarge]').forEach(button => {
  button.addEventListener('click', () => {
    const chapter = button.closest('.chapter');
    const image = button.querySelector('img');
    viewerImage.src = image.getAttribute('src');
    viewerImage.alt = image.alt;
    viewerImage.width = image.width;
    viewerImage.height = image.height;
    viewerTitle.textContent = `${chapter.dataset.page} / 7　${chapter.dataset.title}`;
    viewer.classList.remove('is-fit');
    fitButton.setAttribute('aria-pressed', 'false');
    fitButton.textContent = '全体表示';
    openDialog(viewer, button);
    viewerScroll.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  });
});

document.querySelector('#viewer-close').addEventListener('click', () => closeDialog(viewer));
fitButton.addEventListener('click', () => {
  const fit = viewer.classList.toggle('is-fit');
  fitButton.setAttribute('aria-pressed', String(fit));
  fitButton.textContent = fit ? '文字を拡大' : '全体表示';
  viewerScroll.scrollTo({ top: 0, left: 0, behavior: 'instant' });
});
