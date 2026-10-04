import "@fontsource-variable/montserrat";
import "@fontsource-variable/inter";
import "./styles.css";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { createHeroScene, type HeroScene } from "./hero3d";
import { CONTACT_EMAIL, PLATFORM_MODULES } from "./content";

gsap.registerPlugin(ScrollTrigger);
if (import.meta.env.DEV) Object.assign(window, { gsap, ScrollTrigger });

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(sel));

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
if (reducedMotion) document.documentElement.classList.add("reduced-motion");

/* ------------------------------------------------------------------ */
/* Smooth scroll                                                       */
/* ------------------------------------------------------------------ */
let lenis: Lenis | null = null;
if (!reducedMotion) {
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis!.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function scrollToTarget(target: string | HTMLElement) {
  const el = typeof target === "string" ? $(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -72, duration: 1.4 });
  else el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
}

/* ------------------------------------------------------------------ */
/* Text splitting                                                      */
/* ------------------------------------------------------------------ */
function splitWords(el: HTMLElement, wrapClass = "split-line", innerClass = "split-word") {
  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = (child.textContent ?? "").split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(document.createTextNode(" ")); return; }
          const outer = document.createElement("span");
          outer.className = wrapClass;
          const inner = document.createElement("span");
          inner.className = innerClass;
          inner.textContent = part;
          outer.append(inner);
          frag.append(outer);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    });
  };
  el.setAttribute("aria-label", el.textContent?.trim().replace(/\s+/g, " ") ?? "");
  walk(el);
  $$(`.${wrapClass}`, el).forEach((w) => w.setAttribute("aria-hidden", "true"));
  return $$<HTMLElement>(`.${innerClass}`, el);
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */
let hero: HeroScene | null = null;
const heroCanvas = $<HTMLCanvasElement>("[data-hero-canvas]");
if (heroCanvas) hero = createHeroScene(heroCanvas, { reducedMotion });

const heroTitle = $("[data-split='hero']");
const heroWords = heroTitle ? splitWords(heroTitle) : [];

function heroIntro() {
  const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
  tl.from(heroWords, { yPercent: 110, rotate: 4, duration: 1.3, stagger: 0.06 }, 0);
  tl.from("[data-hero-in]", { y: 30, autoAlpha: 0, duration: 1.2, stagger: 0.12 }, 0.35);
  tl.from(".nav__inner", { y: -30, autoAlpha: 0, duration: 1 }, 0.2);
  if (hero) tl.add(hero.intro(), 0);
  return tl;
}

/* ------------------------------------------------------------------ */
/* Preloader                                                           */
/* ------------------------------------------------------------------ */
function runPreloader(onReveal: () => void): Promise<void> {
  const pre = $(".preloader");
  if (!pre || reducedMotion) { pre?.remove(); return Promise.resolve(); }
  document.body.classList.add("is-loading");
  lenis?.stop();
  return new Promise((resolve) => {
    const tl = gsap.timeline({
      onComplete: () => {
        pre.remove();
        document.body.classList.remove("is-loading");
        lenis?.start();
        resolve();
      },
    });
    tl.to(".preloader__mark .mark__frame", { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut" })
      .from(".preloader__mark .mark__band--2", { y: 18, autoAlpha: 0, duration: 0.45, ease: "back.out(2)" }, 0.3)
      .from(".preloader__mark .mark__band--1", { y: 18, autoAlpha: 0, duration: 0.45, ease: "back.out(2)" }, 0.42)
      .from(".preloader__mark .mark__top", { y: 18, autoAlpha: 0, duration: 0.45, ease: "back.out(2)" }, 0.54)
      .from(".preloader__mark .mark__glyph", { autoAlpha: 0, duration: 0.3 }, 0.8)
      .to(".preloader__bar span", { scaleX: 1, duration: 1.1, ease: "power2.inOut" }, 0)
      .to(".preloader__mark", { scale: 0.8, autoAlpha: 0, duration: 0.5, ease: "power2.in" }, 1.25)
      .to(".preloader__bar", { autoAlpha: 0, duration: 0.3 }, 1.25)
      .to(pre, { clipPath: "inset(0 0 100% 0)", duration: 0.9, ease: "expo.inOut" }, 1.45)
      .add(onReveal, 1.7);
  });
}

/* ------------------------------------------------------------------ */
/* Scroll animations                                                   */
/* ------------------------------------------------------------------ */
function initScrollAnimations() {
  // Hero 3D reacts to scroll; content drifts and fades
  ScrollTrigger.create({
    trigger: ".hero",
    start: "top top",
    end: "bottom top",
    scrub: true,
    onUpdate: (self) => hero?.setProgress(self.progress),
  });
  gsap.to(".hero__content", { yPercent: 28, autoAlpha: 0.15, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  // Parallax layers
  $$("[data-speed]").forEach((el) => {
    const speed = parseFloat(el.dataset.speed ?? "0");
    const section = el.closest("section") ?? el.parentElement!;
    const isHero = section.classList.contains("hero");
    gsap.fromTo(
      el,
      { y: isHero ? 0 : () => -speed * window.innerHeight * 0.4 },
      {
        y: () => speed * window.innerHeight * (isHero ? 0.6 : 0.4),
        ease: "none",
        scrollTrigger: { trigger: section, start: isHero ? "top top" : "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true },
      }
    );
  });

  // Heading word reveals
  $$("[data-split]:not([data-split='hero'])").forEach((el) => {
    const words = splitWords(el);
    gsap.from(words, {
      yPercent: 110, rotate: 3, duration: 1.1, ease: "expo.out", stagger: 0.05,
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });

  // Generic reveals
  $$("[data-reveal]").forEach((el) => {
    gsap.from(el, { y: 36, autoAlpha: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } });
  });
  $$("[data-stagger]").forEach((group) => {
    gsap.from(group.children, {
      y: 60, autoAlpha: 0, duration: 1.1, ease: "expo.out", stagger: 0.1,
      scrollTrigger: { trigger: group, start: "top 85%" },
    });
  });

  // Scroll-scrubbed statement: words light up as you read
  const statement = $("[data-scrub-words]");
  if (statement) {
    const words = splitWords(statement, "wm", "w");
    gsap.to(words, {
      color: (_i, t: HTMLElement) => (t.closest(".hl") ? "#0046ab" : "#06346d"),
      stagger: 0.1, ease: "none",
      scrollTrigger: { trigger: statement, start: "top 80%", end: "bottom 45%", scrub: true },
    });
  }

  // Service cards slide in with a slight scale
  $$("[data-svc]").forEach((card) => {
    gsap.from(card, { y: 80, scale: 0.96, autoAlpha: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: card, start: "top 90%" } });
  });

  // Price count-up
  $$("[data-count]").forEach((el) => {
    const target = parseInt(el.dataset.count ?? "0", 10);
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target, duration: 1.6, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 90%" },
      onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString("en-IN"); },
    });
  });

  // Product line drawings
  $$<SVGGeometryElement>(".product__line, .product__route").forEach((path) => {
    const len = path.getTotalLength();
    gsap.fromTo(path, { strokeDasharray: path.classList.contains("product__route") ? "8 8" : len, strokeDashoffset: len },
      { strokeDashoffset: 0, duration: 2, ease: "power2.inOut", scrollTrigger: { trigger: path, start: "top 85%" } });
  });

  // Solutions journey connectors
  gsap.from(".journey i", { scaleX: 0, duration: 0.8, ease: "power2.out", stagger: 0.2, scrollTrigger: { trigger: ".journey", start: "top 85%" } });

  // Marquee — speeds up and reverses with scroll velocity
  const track = $("[data-marquee]");
  if (track) {
    const loop = gsap.to(track, { xPercent: -50, duration: 30, ease: "none", repeat: -1 });
    ScrollTrigger.create({
      onUpdate: (self) => {
        const v = self.getVelocity();
        gsap.to(loop, { timeScale: gsap.utils.clamp(-4, 4, 1 + Math.abs(v) / 400) * (self.direction === -1 ? -1 : 1), duration: 0.3, overwrite: true });
        gsap.to(loop, { timeScale: self.direction === -1 ? -1 : 1, duration: 1.2, delay: 0.3 });
      },
    });
  }

  initProcess();
}

/* ------------------------------------------------------------------ */
/* Process: pinned horizontal scroll on desktop                       */
/* ------------------------------------------------------------------ */
function initProcess() {
  const section = $("[data-process]");
  const track = $("[data-process-track]");
  const bar = $("[data-process-bar]");
  if (!section || !track || !bar) return;

  const mm = gsap.matchMedia();
  mm.add("(min-width: 900px)", () => {
    section.classList.add("is-horizontal");
    const distance = () => track.scrollWidth - window.innerWidth;
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: section, start: "top top", end: () => `+=${distance()}`,
        pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: (self) => gsap.set(bar, { scaleX: self.progress }),
      },
    });
    $$(".step", track).forEach((step) => {
      gsap.from(step, {
        y: 60, rotate: 3, autoAlpha: 0.2, ease: "power2.out",
        scrollTrigger: { trigger: step, containerAnimation: tween, start: "left 95%", end: "left 60%", scrub: true },
      });
    });
    return () => section.classList.remove("is-horizontal");
  });
  mm.add("(max-width: 899px)", () => {
    gsap.from($$(".step", track), { y: 50, autoAlpha: 0, stagger: 0.08, duration: 1, ease: "expo.out", scrollTrigger: { trigger: track, start: "top 85%" } });
    ScrollTrigger.create({ trigger: track, start: "top 70%", end: "bottom 60%", scrub: true, onUpdate: (s) => gsap.set(bar, { scaleX: s.progress }) });
  });
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */
function initNav() {
  const nav = $("[data-nav]")!;
  const toggle = $("[data-menu-toggle]")!;
  let lastY = 0;

  const onScroll = (y: number) => {
    const menuOpen = nav.classList.contains("menu-open");
    nav.classList.toggle("is-scrolled", y > 40);
    if (!menuOpen) nav.classList.toggle("is-hidden", y > lastY && y > 400);
    lastY = y;
  };
  if (lenis) lenis.on("scroll", ({ scroll }: { scroll: number }) => onScroll(scroll));
  else window.addEventListener("scroll", () => onScroll(window.scrollY), { passive: true });

  // Dark nav over dark sections
  $$(".products, .platform, .process, .contact, .footer").forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: "top 40px", end: "bottom 40px",
      onToggle: (self) => nav.classList.toggle("is-dark", self.isActive),
    });
  });

  // Active link
  const links = $$<HTMLAnchorElement>(".nav__links a");
  links.forEach((link) => {
    const sec = $(link.getAttribute("href")!);
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec, start: "top 50%", end: "bottom 50%",
      onToggle: (self) => self.isActive && links.forEach((l) => l.classList.toggle("is-active", l === link)),
    });
  });

  const setMenu = (open: boolean) => {
    nav.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (open) { lenis?.stop(); nav.classList.remove("is-hidden"); } else lenis?.start();
    if (open) gsap.from(".menu__links a", { y: 40, autoAlpha: 0, stagger: 0.05, duration: 0.8, ease: "expo.out", delay: 0.15 });
  };
  toggle.addEventListener("click", () => setMenu(!nav.classList.contains("menu-open")));
  document.addEventListener("keydown", (e) => e.key === "Escape" && setMenu(false));

  // In-page anchors
  $$<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href")!;
      if (href.length < 2) return;
      const target = $(href);
      if (!target) return;
      e.preventDefault();
      setMenu(false);
      const service = a.dataset.service;
      if (service) {
        const select = $<HTMLSelectElement>("[data-service-select]");
        if (select) select.value = Array.from(select.options).find((o) => o.text === service)?.text ?? select.value;
      }
      scrollToTarget(target);
    });
  });
}

/* ------------------------------------------------------------------ */
/* Services sticky index                                               */
/* ------------------------------------------------------------------ */
function initServicesIndex() {
  const links = $$<HTMLAnchorElement>("[data-svc-link]");
  const progress = $("[data-svc-progress]");
  $$("[data-svc]").forEach((card) => {
    ScrollTrigger.create({
      trigger: card, start: "top 55%", end: "bottom 55%",
      onToggle: (self) => {
        if (!self.isActive) return;
        links.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === `#${card.id}`));
      },
    });
  });
  if (progress) {
    gsap.to(progress, { scaleX: 1, ease: "none", scrollTrigger: { trigger: ".services__panels", start: "top 55%", end: "bottom 55%", scrub: true } });
  }
}

/* ------------------------------------------------------------------ */
/* Business OS: module explorer + orbit                                */
/* ------------------------------------------------------------------ */
function initPlatform() {
  const tabs = $("[data-module-tabs]");
  const panel = $("[data-module-panel]");
  const spin = $("[data-orbit-spin]");
  if (!tabs || !panel || !spin) return;

  const nodes = PLATFORM_MODULES.map((m) => {
    const node = document.createElement("div");
    node.className = "orbit__node";
    node.innerHTML = `<span>${m.name}</span>`;
    spin.append(node);
    return node;
  });

  const buttons = PLATFORM_MODULES.map((m, i) => {
    const b = document.createElement("button");
    b.className = "module-tab";
    b.type = "button";
    b.setAttribute("role", "tab");
    b.id = `module-tab-${i}`;
    b.setAttribute("aria-controls", "module-panel");
    b.innerHTML = `<small>${String(i + 1).padStart(2, "0")}</small>${m.name}`;
    tabs.append(b);
    return b;
  });
  panel.id = "module-panel";

  let current = -1;
  let autoplay = true;
  const select = (i: number, animate = true) => {
    if (i === current) return;
    current = i;
    const m = PLATFORM_MODULES[i];
    buttons.forEach((b, j) => {
      b.setAttribute("aria-selected", String(j === i));
      b.tabIndex = j === i ? 0 : -1;
    });
    nodes.forEach((n, j) => n.classList.toggle("is-active", j === i));
    panel.setAttribute("aria-labelledby", buttons[i].id);
    panel.innerHTML = `
      <p class="panel-kicker">Module ${String(i + 1).padStart(2, "0")} / ${String(PLATFORM_MODULES.length).padStart(2, "0")}</p>
      <h3>${m.name}</h3>
      <p class="lead lead--light">${m.summary}</p>
      <ul>${m.features.map((f) => `<li>${f}</li>`).join("")}</ul>`;
    if (animate && !reducedMotion) {
      gsap.from(panel.querySelectorAll("h3, .panel-kicker, .lead"), { y: 20, autoAlpha: 0, duration: 0.6, stagger: 0.05, ease: "expo.out" });
      gsap.from(panel.querySelectorAll("li"), { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.04, ease: "expo.out", delay: 0.1 });
    }
  };
  buttons.forEach((b, i) => {
    b.addEventListener("click", () => { autoplay = false; select(i); });
    b.addEventListener("keydown", (e) => {
      const dir = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      autoplay = false;
      const next = (current + dir + buttons.length) % buttons.length;
      select(next);
      buttons[next].focus();
    });
  });
  select(0, false);

  // Orbit positions — labels stay upright while circling
  let angle = 0;
  let widths = nodes.map((n) => n.offsetWidth);
  const place = () => {
    const size = spin.clientWidth;
    nodes.forEach((n, i) => {
      const outer = i % 2 === 0;
      const r = size * (outer ? 0.44 : 0.3);
      const a = angle * (outer ? 1 : -1.3) + (i / nodes.length) * Math.PI * 2;
      // Keep every label inside the orbit box so nothing spills off-screen
      const limit = Math.max(0, size / 2 - widths[i] / 2);
      const x = gsap.utils.clamp(-limit, limit, Math.cos(a) * r);
      n.style.transform = `translate(-50%, -50%) translate(${x}px, ${Math.sin(a) * r}px)`;
    });
  };
  place();
  window.addEventListener("resize", () => { widths = nodes.map((n) => n.offsetWidth); place(); });
  document.fonts?.ready.then(() => { widths = nodes.map((n) => n.offsetWidth); place(); });

  let inView = false;
  ScrollTrigger.create({ trigger: ".platform", start: "top bottom", end: "bottom top", onToggle: (s) => (inView = s.isActive) });
  if (!reducedMotion) {
    gsap.ticker.add((_t, dt) => {
      if (!inView) return;
      angle += dt * 0.00012;
      place();
    });
    gsap.from(".orbit__ring", { scale: 0.6, autoAlpha: 0, duration: 1.4, stagger: 0.12, ease: "expo.out", scrollTrigger: { trigger: ".orbit", start: "top 80%" } });
    gsap.from(".orbit__core", { scale: 0, duration: 1.2, ease: "back.out(1.6)", scrollTrigger: { trigger: ".orbit", start: "top 80%" } });
    gsap.from(nodes, { autoAlpha: 0, scale: 0.5, duration: 0.8, stagger: 0.06, ease: "back.out(2)", scrollTrigger: { trigger: ".orbit", start: "top 75%" } });
  }

  // Auto-advance modules while the section is on screen, until the visitor takes over
  window.setInterval(() => {
    if (autoplay && inView && !document.hidden) select((current + 1) % PLATFORM_MODULES.length);
  }, 3800);
}

/* ------------------------------------------------------------------ */
/* Pointer micro-interactions                                          */
/* ------------------------------------------------------------------ */
function initPointerFx() {
  if (!finePointer || reducedMotion) return;

  $$(".tilt").forEach((card) => {
    gsap.set(card, { transformPerspective: 900 });
    const rx = gsap.quickTo(card, "rotationX", { duration: 0.6, ease: "power3.out" });
    const ry = gsap.quickTo(card, "rotationY", { duration: 0.6, ease: "power3.out" });
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      rx((0.5 - py) * 8);
      ry((px - 0.5) * 10);
      card.style.setProperty("--mx", `${px * 100}%`);
      card.style.setProperty("--my", `${py * 100}%`);
    });
    card.addEventListener("pointerleave", () => { rx(0); ry(0); });
  });

  $$(".magnetic").forEach((btn) => {
    const x = gsap.quickTo(btn, "x", { duration: 0.5, ease: "power3.out" });
    const y = gsap.quickTo(btn, "y", { duration: 0.5, ease: "power3.out" });
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.25);
      y((e.clientY - r.top - r.height / 2) * 0.35);
    });
    btn.addEventListener("pointerleave", () => { x(0); y(0); });
  });
}

/* ------------------------------------------------------------------ */
/* Contact form                                                        */
/* ------------------------------------------------------------------ */
function initForm() {
  const form = $<HTMLFormElement>("[data-contact-form]");
  const status = $("[data-form-status]");
  if (!form || !status) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    let valid = true;
    (["name", "email", "message"] as const).forEach((key) => {
      const input = form.elements.namedItem(key) as HTMLInputElement;
      const ok = key === "email" ? /^\S+@\S+\.\S+$/.test(input.value) : input.value.trim().length > 0;
      input.closest(".field")?.classList.toggle("is-invalid", !ok);
      if (!ok) valid = false;
    });
    if (!valid) { status.textContent = "Please fill in your name, a valid email and a short message."; return; }

    const subject = `Project enquiry — ${data.get("service")}`;
    const body = [
      `Name: ${data.get("name")}`,
      `Email: ${data.get("email")}`,
      `Company: ${data.get("company") || "—"}`,
      `Phone: ${data.get("phone") || "—"}`,
      `Service: ${data.get("service")}`,
      "",
      String(data.get("message")),
    ].join("\n");
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.textContent = "Opening your email app — send the message and we'll be in touch.";
  });
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */
$$("[data-year]").forEach((el) => (el.textContent = String(new Date().getFullYear())));
initNav();
initServicesIndex();
initPlatform();
initPointerFx();
initForm();

if (reducedMotion) {
  $(".preloader")?.remove();
  $("[data-scrub-words]")?.classList.add("no-scrub");
} else {
  const intro = heroIntro().pause(0);
  runPreloader(() => intro.play());
  initScrollAnimations();
}

window.addEventListener("load", () => ScrollTrigger.refresh());
document.fonts?.ready.then(() => ScrollTrigger.refresh());
