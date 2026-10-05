// =========================
// Google Analytics Configuration
// =========================
// Google tag (gtag.js) - Configured for G-5HBN957GV9
// gtag.js is 167 KB and fbevents.js is 111 KB. Fetched during the initial page
// load they were the two largest contributors to main-thread blocking time.
// Both are now requested on the first real user interaction, or once the page
// has gone idle, whichever comes first.
//
// The gtag and fbq stubs are still created straight away and both queue, so
// 'js', 'config' and PageView are recorded at the normal moment and are sent
// as soon as the scripts arrive. No event is dropped, it just leaves a second
// or two later.
(function() {
  const GA_MEASUREMENT_ID = 'G-5HBN957GV9';
  const IDLE_TIMEOUT_MS = 3000;
  const WAKE_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll'];

  // Initialize Google Analytics
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
  window.gtag('js', new Date());

  // Session context, fixed on the first page of the session and attached to
  // every event after it (page_view, user_engagement, WhatsApp clicks):
  //   landing_page  the path the session entered on
  //   ai_source     the AI assistant that referred it, or '' for none
  //   traffic_type  'AI referral' when ai_source is set
  // ChatGPT often strips the referrer but tags links utm_source=chatgpt.com, so
  // both are read. GA4 reports these once they are registered as custom
  // dimensions (Admin > Custom definitions).
  const AI_REFERRERS = {
    'chatgpt.com': 'chatgpt', 'chat.openai.com': 'chatgpt',
    'perplexity.ai': 'perplexity', 'gemini.google.com': 'gemini',
    'copilot.microsoft.com': 'copilot', 'claude.ai': 'claude'
  };
  const aiSourceFor = (host) => {
    host = String(host || '').toLowerCase().replace(/^www\./, '');
    for (const domain in AI_REFERRERS) {
      if (host === domain || host.endsWith('.' + domain)) return AI_REFERRERS[domain];
    }
    return '';
  };
  const SESSION_KEY = 'pc_session_ctx';
  let ctx = null;
  try { ctx = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (e) {}
  if (!ctx) {
    let referrerHost = '';
    try { referrerHost = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
    const utmSource = new URLSearchParams(location.search).get('utm_source') || '';
    ctx = { landing_page: location.pathname, ai_source: aiSourceFor(referrerHost) || aiSourceFor(utmSource) };
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(ctx)); } catch (e) {}
  }
  window.__pcSessionCtx = ctx;
  window.gtag('set', {
    landing_page: ctx.landing_page,
    ai_source: ctx.ai_source,
    traffic_type: ctx.ai_source ? 'AI referral' : ''
  });
  window.gtag('config', GA_MEASUREMENT_ID);

  let started = false;

  const loadTagsNow = () => {
    if (started) return;
    started = true;
    WAKE_EVENTS.forEach((name) => window.removeEventListener(name, loadTagsNow, true));

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    document.head.appendChild(script);

    // Meta Pixel base code sets this up in the HTML <head>
    if (typeof window.__pcLoadPixel === 'function') {
      window.__pcLoadPixel();
    }
  };

  WAKE_EVENTS.forEach((name) => {
    window.addEventListener(name, loadTagsNow, { once: true, passive: true, capture: true });
  });

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(loadTagsNow, { timeout: IDLE_TIMEOUT_MS });
  } else {
    setTimeout(loadTagsNow, IDLE_TIMEOUT_MS);
  }
})();

// =========================
// End Google Analytics Configuration
// =========================

// =========================
// "Chat with plum" click tracking (Meta Pixel base code lives in HTML <head>)
// =========================
(function() {
  // Track every "Chat with plum" click (any wa.me link or button with that label)
  const isChatWithPlum = (el) => {
    const href = el.getAttribute('href') || '';
    if (/(^|\/\/)(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)/i.test(href)) return true;
    const text = (el.innerText || el.textContent || '').trim();
    return /chat with plum/i.test(text);
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('a, button');
    if (!el || !isChatWithPlum(el)) return;

    if (typeof window.gtag === 'function') {
      const ctx = window.__pcSessionCtx || {};
      window.gtag('event', 'chat_with_plum_click', {
        page: (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index',
        page_path: location.pathname,
        article_slug: el.dataset.article || (location.pathname.startsWith('/blog/') ? (location.pathname.split('/')[2] || '').replace(/\.html$/, '') : ''),
        cta: el.dataset.cta || 'site-chat',
        link_url: el.getAttribute('href') || '',
        landing_page: ctx.landing_page || location.pathname,
        ai_source: ctx.ai_source || '',
        transport_type: 'beacon'
      });
    }
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'ChatWithPlum');
    }
  }, true);
})();
// =========================
// End tracking
// =========================

const accordionAnimation = {
  accordionItems: null,
  activeItem: null,
  init() {
    this.accordion = document.querySelector(".accordion");
    this.accordionItems = document.querySelectorAll(".accordion-item");
    this.activeItem = null;
    this.accordionItems.forEach((item) => {
      const action = item.querySelector(".accordion-action");
      const content = item.querySelector(".accordion-content");
      if (item.classList.contains("active-accordion")) {
        content.classList.remove("hidden");
        content.style.height = "auto";
        this.activeItem = item;
        this.setOpenState(item);
      } else {
        content.classList.add("hidden");
        this.setClosedState(item);
      }
      action.addEventListener("click", (e) => {
        e.preventDefault();
        if (this.activeItem && this.activeItem !== item) {
          this.closeAccordion(this.activeItem);
        }
        if (this.activeItem === item) {
          this.closeAccordion(item);
          this.activeItem = null;
        } else {
          this.openAccordion(item);
          this.activeItem = item;
        }
      });
    });
    this.initAnimation();
  },
  setOpenState(item) {
    const plusIconSpans = item.querySelectorAll(".accordion-plus-icon span");
    const accordionArrow = item.querySelector(".accordion-arrow svg");
    const accordionArrowSpan = item.querySelector(".accordion-arrow");
    if (plusIconSpans.length > 0) {
      plusIconSpans[1].style.transform = "rotate(90deg)";
      plusIconSpans[1].setAttribute("data-state", "true");
    }
    if (accordionArrow) {
      accordionArrow.style.transform = "rotate(180deg)";
      accordionArrow.setAttribute("data-state", "true");
    }
    if (accordionArrowSpan) {
      accordionArrowSpan.setAttribute("data-state", "true");
    }
  },
  setClosedState(item) {
    const plusIconSpans = item.querySelectorAll(".accordion-plus-icon span");
    const accordionArrow = item.querySelector(".accordion-arrow svg");
    const accordionArrowSpan = item.querySelector(".accordion-arrow");
    if (plusIconSpans.length > 0) {
      plusIconSpans[1].setAttribute("data-state", "false");
    }
    if (accordionArrow) {
      accordionArrow.setAttribute("data-state", "false");
    }
    if (accordionArrowSpan) {
      accordionArrowSpan.setAttribute("data-state", "false");
    }
  },
  initAnimation() {
    this.accordionItems.forEach((item, index) => {
      gsap.set(item, {
        opacity: 0,
        y: 50,
        filter: "blur(20px)",
        overflow: "hidden"
      });
      gsap.fromTo(
        item,
        {
          opacity: 0,
          y: 50,
          filter: "blur(20px)"
        },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.5,
          delay: index * 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: item,
            start: "top 90%",
            end: "top 50%",
            scrub: false,
            once: true
          }
        }
      );
    });
  },
  openAccordion(item) {
    const content = item.querySelector(".accordion-content");
    const plusIconSpans = item.querySelectorAll(".accordion-plus-icon span");
    const accordionArrow = item.querySelector(".accordion-arrow svg");
    const accordionArrowSpan = item.querySelector(".accordion-arrow");
    content.classList.remove("hidden");
    content.style.height = "auto";
    const contentHeight = content.scrollHeight;
    content.style.height = "0px";
    gsap.to(content, {
      height: contentHeight,
      opacity: 1,
      duration: 0.3
    });
    if (plusIconSpans.length > 0) {
      gsap.to(plusIconSpans[1], {
        rotation: 90,
        duration: 0.3,
        ease: "power2.out",
        onComplete: () => {
          plusIconSpans[1].setAttribute("data-state", "true");
        }
      });
    }
    if (accordionArrow) {
      accordionArrow.setAttribute("data-state", "true");
      gsap.to(accordionArrow, {
        rotation: -180,
        duration: 0.3,
        ease: "power2.out"
      });
    }
    if (accordionArrowSpan) {
      accordionArrowSpan.setAttribute("data-state", "true");
    }
  },
  closeAccordion(item) {
    const content = item.querySelector(".accordion-content");
    const plusIconSpans = item.querySelectorAll(".accordion-plus-icon span");
    const accordionArrow = item.querySelector(".accordion-arrow svg");
    const accordionArrowSpan = item.querySelector(".accordion-arrow");
    content.style.height = "auto";
    const contentHeight = content.scrollHeight;
    content.style.height = contentHeight + "px";
    gsap.to(content, {
      height: 0,
      opacity: 0,
      duration: 0.5,
      onComplete: () => {
        content.classList.add("hidden");
        content.style.height = "0px";
      }
    });
    if (plusIconSpans.length > 0) {
      gsap.to(plusIconSpans[1], {
        rotation: 0,
        duration: 0.5,
        ease: "power2.out",
        onComplete: () => {
          plusIconSpans[1].setAttribute("data-state", "false");
        }
      });
    }
    if (accordionArrow) {
      accordionArrow.setAttribute("data-state", "false");
      gsap.to(accordionArrow, {
        rotation: 0,
        duration: 0.5,
        ease: "power2.out"
      });
    }
    if (accordionArrowSpan) {
      accordionArrowSpan.setAttribute("data-state", "false");
    }
  }
};
if (typeof window !== "undefined") {
  accordionAnimation.init();
}
const headerAnimation = {
  init() {
    const headerOne = document.querySelector(".header-one");
    const whatsappLink = document.querySelector(".whatsapp-link");
    const nav = document.querySelector(".header-one nav");
    const hamburgerContainer = document.querySelector(".hamburger-container");
    const getStartedContainer = document.querySelector(".get-started-container");
    const headerTwo = document.querySelector(".header-two");
    const headerThree = document.querySelector(".header-three");
    const headerFour = document.querySelector(".header-four");
    const headerFive = document.querySelector(".header-five");
    const headerSix = document.querySelector(".header-six");
    if (!headerOne && !headerTwo && !headerThree && !headerFour && !headerFive && !headerSix) {
      return;
    }
    [headerTwo, headerThree, headerFour, headerFive, headerSix].forEach((header) => {
      if (header) {
        header.style.transition = "all 0.5s ease-in-out";
      }
    });
    const update = () => {
      const scrollY = window.scrollY;
      if (headerOne) {
        if (scrollY > 200) {
          headerOne.classList.add("scroll-header", "header-scrolled", "scrolling-down");
          headerOne.classList.remove("scrolling-up");
          if (nav) {
            nav.style.opacity = "0";
            nav.style.pointerEvents = "none";
          }
          if (getStartedContainer) {
            getStartedContainer.style.opacity = "0";
            getStartedContainer.style.pointerEvents = "none";
          }
          if (hamburgerContainer) {
            hamburgerContainer.style.opacity = "0";
            hamburgerContainer.style.pointerEvents = "none";
          }
          if (whatsappLink) {
            whatsappLink.style.opacity = "1";
            whatsappLink.style.pointerEvents = "auto";
          }
        } else {
          headerOne.classList.remove("scroll-header", "header-scrolled", "scrolling-down");
          headerOne.classList.add("scrolling-up");
          if (whatsappLink) {
            whatsappLink.style.opacity = "0";
            whatsappLink.style.pointerEvents = "none";
          }
          if (nav) {
            nav.style.opacity = "1";
            nav.style.pointerEvents = "auto";
          }
          if (getStartedContainer) {
            getStartedContainer.style.opacity = "1";
            getStartedContainer.style.pointerEvents = "auto";
          }
          if (hamburgerContainer) {
            hamburgerContainer.style.opacity = "1";
            hamburgerContainer.style.pointerEvents = "auto";
          }
        }
      }
      if (headerTwo) {
        if (scrollY > 150) {
          headerTwo.style.top = "20px";
          headerTwo.classList.add("header-two-scroll");
        } else {
          headerTwo.classList.remove("header-two-scroll");
          headerTwo.style.top = "50px";
        }
      }
      if (headerThree) {
        headerThree.classList.toggle("header-three-scroll", scrollY > 100);
      }
      if (headerFour) {
        headerFour.classList.toggle("header-four-scroll", scrollY > 100);
      }
      if (headerFive) {
        headerFive.classList.toggle("header-five-scroll", scrollY > 25);
      }
      if (headerSix) {
        headerSix.classList.toggle("header-six-scroll", scrollY > 100);
      }
    };
    let ticking = false;
    const onScroll = () => {
      if (ticking) {
        return;
      }
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
  }
};
if (typeof window !== "undefined") {
  headerAnimation.init();
}
const initRevealElements = () => {
  const elements = document.querySelectorAll("[data-ns-animate]");
  const Springer = window.Springer.default;
  elements.forEach((elem) => {
    const duration = elem.getAttribute("data-duration") ? parseFloat(elem.getAttribute("data-duration")) : 0.6;
    const delay = elem.getAttribute("data-delay") ? parseFloat(elem.getAttribute("data-delay")) : 0;
    const offset = elem.getAttribute("data-offset") ? parseFloat(elem.getAttribute("data-offset")) : 60;
    const instant = elem.hasAttribute("data-instant") && elem.getAttribute("data-instant") !== "false";
    const start = elem.getAttribute("data-start") || "top 90%";
    const end = elem.getAttribute("data-end") || "top 50%";
    const direction = elem.getAttribute("data-direction") || "down";
    const useSpring = elem.hasAttribute("data-spring");
    const spring = useSpring ? Springer(0.2, 0.8) : null;
    const rotation = elem.getAttribute("data-rotation") ? parseFloat(elem.getAttribute("data-rotation")) : 0;
    const animationType = elem.getAttribute("data-animation-type") || "from";
    elem.style.opacity = "1";
    elem.style.filter = "blur(0)";
    let animationProps;
    if (animationType === "to") {
      animationProps = {
        opacity: 1,
        filter: "blur(0)",
        duration,
        delay,
        ease: useSpring ? spring : "power2.out"
      };
      if (rotation !== 0) {
        animationProps.rotation = rotation;
      }
    } else {
      animationProps = {
        opacity: 0,
        filter: "blur(16px)",
        duration,
        delay,
        ease: useSpring ? spring : "power2.out"
      };
      if (rotation !== 0) {
        animationProps.rotation = rotation;
      }
    }
    if (!instant) {
      animationProps.scrollTrigger = {
        trigger: elem,
        start,
        end,
        scrub: false
      };
    }
    switch (direction) {
      case "left":
        animationProps.x = -offset;
        break;
      case "right":
        animationProps.x = offset;
        break;
      case "down":
        animationProps.y = offset;
        break;
      case "up":
      default:
        animationProps.y = -offset;
        break;
    }
    if (animationType === "to") {
      gsap.to(elem, animationProps);
    } else {
      gsap.from(elem, animationProps);
    }
  });
};
document.addEventListener("DOMContentLoaded", () => {
  initRevealElements();
});
let lenis;
const smoothScrolling = () => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768 || "ontouchstart" in window;
  if (!isMobile) {
    lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true
    });
    lenis.on("scroll", () => ScrollTrigger.update());
    gsap.ticker.add((time) => {
      lenis.raf(time * 1e3);
    });
    gsap.ticker.lagSmoothing(0);
  }
};
document.addEventListener("DOMContentLoaded", () => {
  smoothScrolling();
});
const forceThemeSwitcher = {
  init() {
    const html = document.documentElement;
    const forced = html.dataset.forceTheme;
    if (forced) {
      html.classList.remove("dark", "light");
      html.classList.add(forced);
      return;
    }
    const stored = localStorage.getItem("color-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored || (prefersDark ? "dark" : "light");
    html.classList.remove("dark", "light");
    html.classList.add(theme);
  }
};
if (typeof window !== "undefined") {
  forceThemeSwitcher.init();
}
(() => {
  const LOADER_CLASS = "site-loader";
  const HIDDEN_CLASS = "site-loader--hidden";
  const BODY_LOADING_CLASS = "is-loading";
  const MIN_DISPLAY_MS = 700;
  const MAX_TOTAL_WAIT_MS = 10000;

  const body = document.body;
  const loader = document.querySelector(`.${LOADER_CLASS}`);
  const loaderVideo = loader ? loader.querySelector("video") : null;
  const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
  let hasHidden = false;

  const removeLoader = () => {
    if (loader && loader.parentNode) {
      loader.remove();
    }
  };

  const hideLoader = () => {
    if (hasHidden) {
      return;
    }
    hasHidden = true;
    if (body) {
      body.classList.remove(BODY_LOADING_CLASS);
    }
    if (!loader) {
      return;
    }
    loader.classList.add(HIDDEN_CLASS);
    loader.addEventListener("transitionend", removeLoader, { once: true });
    setTimeout(removeLoader, 900);
  };

  const scheduleHide = () => {
    if (hasHidden) {
      return;
    }
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const elapsed = now - startTime;
    const waitMs = Math.max(0, MIN_DISPLAY_MS - elapsed);
    setTimeout(hideLoader, waitMs);
  };

  if (body) {
    body.classList.add(BODY_LOADING_CLASS);
  }

  if (loaderVideo) {
    loaderVideo.preload = "auto";
    const playPromise = loaderVideo.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  }

  setTimeout(hideLoader, MAX_TOTAL_WAIT_MS);

  // Hide on DOMContentLoaded rather than window.load. Waiting for load meant
  // waiting for every image and video on the page, so a single heavy asset in
  // the footer could hold the whole site behind a white screen for ten
  // seconds. main.js is the last script on the page, so GSAP and the reveal
  // animations are already wired up by the time this fires, and MIN_DISPLAY_MS
  // still keeps the loader on screen long enough to read as deliberate.
  if (document.readyState !== "loading") {
    scheduleHide();
  } else {
    document.addEventListener("DOMContentLoaded", scheduleHide, { once: true });
  }
})();

// Videos marked data-lazy-video load and start only once they scroll into
// view. The footer logo used to carry `autoplay`, which made the browser
// download the whole clip during page load and kept window.load pending.
(() => {
  const videos = document.querySelectorAll("video[data-lazy-video]");
  if (!videos.length) {
    return;
  }

  const start = (video) => {
    if (video.dataset.lazyVideoStarted) {
      return;
    }
    video.dataset.lazyVideoStarted = "1";
    video.preload = "auto";
    video.load();
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  };

  if (typeof IntersectionObserver !== "function") {
    videos.forEach(start);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }
      start(entry.target);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "200px" });

  videos.forEach((video) => observer.observe(video));
})();
