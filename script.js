/* ============================================================
   Ember & Oak — interactions
   ============================================================ */
(function () {
  "use strict";

  /* ---------- current year ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- sticky header ---------- */
  const header = document.getElementById("header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- mobile nav ---------- */
  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");

  const closeNav = () => {
    mainNav.classList.remove("open");
    navToggle.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  };

  navToggle.addEventListener("click", () => {
    const open = mainNav.classList.toggle("open");
    navToggle.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", String(open));
  });

  mainNav.addEventListener("click", (e) => {
    if (e.target.tagName === "A") closeNav();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNav();
  });

  /* ---------- reveal on scroll ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("visible"));
  }

  /* ---------- opening hours: live "open now" pill ---------- */
  const WEEK_SCHEDULE = [
    { day: "Sunday",    open: "10:00", close: "21:00" },
    { day: "Monday",    open: "12:00", close: "22:00" },
    { day: "Tuesday",   open: "12:00", close: "22:00" },
    { day: "Wednesday", open: "12:00", close: "22:00" },
    { day: "Thursday",  open: "12:00", close: "22:00" },
    { day: "Friday",    open: "12:00", close: "23:00" },
    { day: "Saturday",  open: "10:00", close: "23:00" },
  ];

  const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };

  const updateOpenPill = () => {
    const pill = document.getElementById("openPill");
    const text = document.getElementById("openPillText");
    if (!pill || !text) return;

    const now = new Date();
    const schedule = WEEK_SCHEDULE[now.getDay()];
    const minutes = now.getHours() * 60 + now.getMinutes();
    const openM = toMinutes(schedule.open);
    const closeM = toMinutes(schedule.close);

    if (minutes >= openM && minutes < closeM) {
      pill.classList.add("is-open");
      pill.classList.remove("is-closed");
      text.textContent = `Open now · closes at ${schedule.close}`;
    } else {
      pill.classList.add("is-closed");
      pill.classList.remove("is-open");
      text.textContent =
        minutes < openM
          ? `Closed now · opens at ${schedule.open}`
          : `Closed now · opens tomorrow at ${WEEK_SCHEDULE[(now.getDay() + 1) % 7].open}`;
    }
  };
  updateOpenPill();
  setInterval(updateOpenPill, 60 * 1000);

  /* ---------- reservation form ---------- */
  const resForm = document.getElementById("resForm");
  const resSuccess = document.getElementById("resSuccess");
  const resSuccessMsg = document.getElementById("resSuccessMsg");
  const resAgain = document.getElementById("resAgain");
  const dateInput = document.getElementById("rDate");

  if (dateInput) {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    dateInput.min = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  }

  if (resForm) {
    resForm.addEventListener("submit", (e) => {
      e.preventDefault();

      if (!resForm.checkValidity()) {
        resForm.reportValidity();
        return;
      }

      const name = resForm.name.value.trim();
      const date = resForm.date.value;
      const time = resForm.time.value;
      const guests = resForm.guests.value;

      const prettyDate = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

      resSuccessMsg.textContent =
        `Thank you, ${name}! Your table for ${guests} is set for ${prettyDate} at ${time}. A confirmation text is on its way.`;

      resForm.hidden = true;
      resSuccess.hidden = false;
      resSuccess.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    resAgain.addEventListener("click", () => {
      resForm.reset();
      resSuccess.hidden = true;
      resForm.hidden = false;
      resForm.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  /* ---------- menu slider (3 per view, arrows + dots) ---------- */
  const track = document.getElementById("menuTrack");
  const prevBtn = document.getElementById("menuPrev");
  const nextBtn = document.getElementById("menuNext");
  const dotsWrap = document.getElementById("menuDots");

  if (track && prevBtn && nextBtn && dotsWrap) {
    const cards = Array.from(track.children);
    let perView = 3;
    let pages = 1;
    let animating = false;
    let animId = null;
    let timerId = null;
    let watchdogId = null;
    let settleTimer = null;
    let useTimerAnim = false; // set true when rAF is unavailable (occluded/embedded browsers)

    /* detect whether requestAnimationFrame actually fires here */
    (function detectRaf() {
      let fired = false;
      requestAnimationFrame(() => { fired = true; });
      setTimeout(() => { useTimerAnim = !fired; }, 150);
    })();

    const step = () => cards[0].getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0);
    const maxScroll = () => track.scrollWidth - track.clientWidth;
    const pageTarget = (p) => Math.max(0, Math.min(maxScroll(), p * perView * step()));
    const currentPage = () => Math.max(0, Math.min(pages - 1, Math.round(track.scrollLeft / (step() * perView))));

    const paint = (page) => {
      prevBtn.disabled = page <= 0;
      nextBtn.disabled = page >= pages - 1;
      dotsWrap.querySelectorAll(".menu-dot").forEach((dot, i) => dot.classList.toggle("active", i === page));
    };

    const sync = () => paint(currentPage());

    const stopDrivers = () => {
      if (animId) cancelAnimationFrame(animId);
      if (timerId) clearInterval(timerId);
      animId = null;
      timerId = null;
    };

    /* smooth animation with a dual driver + watchdog:
       rAF in normal browsers, ~16ms timer where rAF never fires */
    const animateTo = (target, duration = 600) => {
      stopDrivers();
      clearTimeout(watchdogId);
      target = Math.max(0, Math.min(maxScroll(), target));
      if (Math.abs(target - track.scrollLeft) < 1) { animating = false; return; }

      animating = true;
      const start = track.scrollLeft;
      const delta = target - start;
      const t0 = performance.now();
      const easeOut = (t) => 1 - Math.pow(1 - t, 3);

      const drive = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        track.scrollLeft = start + delta * easeOut(p);
        if (p >= 1) {
          stopDrivers();
          clearTimeout(watchdogId);
          animating = false;
          sync();
        }
      };

      watchdogId = setTimeout(() => { // never stall, whatever the environment does
        if (animating) { track.scrollLeft = target; stopDrivers(); animating = false; sync(); }
      }, duration + 150);

      if (useTimerAnim) {
        timerId = setInterval(() => drive(performance.now()), 16);
      } else {
        const tick = (now) => {
          drive(now);
          if (animating) animId = requestAnimationFrame(tick);
        };
        animId = requestAnimationFrame(tick);
      }
    };

    const goTo = (page) => {
      const target = Math.max(0, Math.min(pages - 1, page));
      paint(target);
      animateTo(pageTarget(target));
    };

    const buildDots = () => {
      perView = Math.max(1, Math.round(track.clientWidth / step()));
      pages = Math.max(1, Math.ceil(cards.length / perView));
      dotsWrap.innerHTML = "";
      for (let i = 0; i < pages; i++) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "menu-dot";
        dot.setAttribute("aria-label", `Go to menu page ${i + 1} of ${pages}`);
        dot.addEventListener("click", () => goTo(i));
        dotsWrap.appendChild(dot);
      }
      sync();
    };

    prevBtn.addEventListener("click", () => goTo(currentPage() - 1));
    nextBtn.addEventListener("click", () => goTo(currentPage() + 1));

    /* free swipe (touch/trackpad): update dots live, then settle to the nearest page */
    track.addEventListener("scroll", () => {
      if (animating) return;
      sync();
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        if (animating) return;
        const target = pageTarget(currentPage());
        if (Math.abs(target - track.scrollLeft) > 2) animateTo(target, 320);
      }, 160);
    }, { passive: true });

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const keep = currentPage();
        buildDots();
        track.scrollLeft = pageTarget(Math.min(keep, pages - 1));
        sync();
      }, 150);
    });

    buildDots();
  }

  /* ---------- newsletter (demo) ---------- */
  const newsForm = document.getElementById("newsForm");
  const newsSuccess = document.getElementById("newsSuccess");

  if (newsForm) {
    newsForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!newsForm.checkValidity()) {
        newsForm.reportValidity();
        return;
      }
      newsForm.hidden = true;
      newsSuccess.hidden = false;
    });
  }
})();
