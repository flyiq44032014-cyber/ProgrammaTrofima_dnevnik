(function () {
  "use strict";

  /** @type {{ id: string, name: string, classLabel: string }[]} */
  let children = [];
  /** @type {string} */
  let childId = "nika";
  /** @type {string} ISO date */
  let diaryDate = "2026-03-27";
  /** @type {string[]} */
  let diaryDates = [];

  let tab = "diary";
  let diaryDayAnimBusy = false;
  let teacherDiaryDayAnimBusy = false;

  /** 'chart' | 'grades' */
  let perfSubview = "chart";
  /** @type {string} */
  let gradesSubjectId = "all";
  /** @type {string | null} */
  let expandedGradeDate = null;

  /** @type {'login' | 'register'} */
  let authMode = "login";
  /** @type {'parent' | 'teacher'} */
  let appRole = "parent";
  /** @type {string} */
  let tClassId = "c8a";
  /** @type {string} ISO */
  let tDiaryDate = "2026-04-03";
  /** @type {string[]} */
  let tDiaryDates = [];
  let tCalViewYear = 2026;
  /** month index 0..11 for teacher date-picker */
  let tCalViewMonth = 2;
  /** @type {{ name: string, subject: string } | null} */
  let teacherProfile = null;
  /** @type {{ id: string, label: string, grade: number }[]} */
  let teacherClasses = [];
  /** @type {Record<string, unknown> | null} */
  let editingLesson = null;

  const CHEM_SUBJ = "Химия";
  /** @type {'diary' | 'pupil' | 'tmeet' | 'quarters'} */
  let tTab = "diary";
  /** @type {string | null} */
  let editingStudentKey = null;
  /** @type {string | null} */
  let tSelectedPupilKey = null;

  const $ = (sel, root = document) => root.querySelector(sel);

  /**
   * Календарная дата YYYY-MM-DD без времени в API: интерпретируем как полдень *локального* часового пояса,
   * чтобы день месяца и день недели совпадали со строкой (избегаем сдвига на соседние сутки из-за UTC).
   */
  function dateFromIsoCalendar(isoDateStr) {
    return new Date(String(isoDateStr).trim() + "T12:00:00");
  }

  function readResponseBody(r) {
    return r.text().then((text) => {
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch (_) {
        return { _unparsed: true, raw: text.slice(0, 240) };
      }
    });
  }

  function messageFromErrorBody(r, body) {
    if (body && typeof body === "object" && !body._unparsed) {
      const msg = body.error || body.message;
      if (typeof msg === "string" && msg.trim()) return msg.trim();
    }
    if (r.status) return `Ошибка ${r.status}`;
    return "Ошибка сервера";
  }

  function handleFetched(r, body) {
    if (!r.ok) {
      return Promise.reject({
        message: messageFromErrorBody(r, body),
        status: r.status,
        body,
      });
    }
    return body;
  }

  const fetchCred = { credentials: "include" };

  function api(path) {
    return fetch(path, fetchCred).then((r) =>
      readResponseBody(r).then((body) => handleFetched(r, body))
    );
  }

  function apiPut(path, body) {
    return fetch(path, {
      ...fetchCred,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) =>
      readResponseBody(r).then((parsed) => handleFetched(r, parsed))
    );
  }

  function apiPost(path, body) {
    return fetch(path, {
      ...fetchCred,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) =>
      readResponseBody(r).then((parsed) => handleFetched(r, parsed))
    );
  }

  function getApiErrorMessage(err) {
    if (err == null) return "Неизвестная ошибка";
    if (typeof err === "string") return err;
    if (typeof err.message === "string" && err.message) return err.message;
    if (err.name === "TypeError" && /fetch|network|Network/i.test(String(err.message)))
      return "Нет соединения с сервером";
    return "Ошибка запроса";
  }

  function announceStatus(text) {
    const el = $("#app-announcer");
    if (!el) return;
    el.textContent = "";
    requestAnimationFrame(() => {
      el.textContent = text;
    });
  }

  const MODAL_MOTION_CLASS = "modal-motion";
  const LANDING_MOTION_CLASS = "landing-motion";

  function prefersReducedMotion() {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (_) {
      return false;
    }
  }

  function cancelElAnimations(el) {
    if (!el || typeof el.getAnimations !== "function") return;
    el.getAnimations().forEach((a) => a.cancel());
  }

  function clearModalMotionInline(el) {
    if (!el) return;
    el.style.opacity = "";
    el.style.transform = "";
  }

  const PARENT_TAB_ORDER = ["diary", "performance", "meetings", "finals"];

  function animPromise(anim) {
    if (!anim || typeof anim.finished === "undefined") {
      return Promise.resolve();
    }
    return anim.finished.catch(() => {});
  }

  /** enterFromLeft: новый контент заезжает слева (после «ухода» старого вправо). */
  function runSlideEnter(el, enterFromLeft) {
    if (!el || prefersReducedMotion()) {
      clearModalMotionInline(el);
      return Promise.resolve();
    }
    if (typeof el.animate !== "function") {
      clearModalMotionInline(el);
      return Promise.resolve();
    }
    cancelElAnimations(el);
    const fromX = enterFromLeft ? -32 : 32;
    const inK = [
      { transform: `translate3d(${fromX}px,0,0)`, opacity: 0 },
      { transform: "translate3d(0,0,0)", opacity: 1 },
    ];
    el.style.opacity = "0";
    el.style.transform = `translate3d(${fromX}px,0,0)`;
    void el.offsetHeight;
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const a = el.animate(inK, {
            duration: 300,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "forwards",
          });
          animPromise(a).then(() => {
            a.cancel();
            clearModalMotionInline(el);
            resolve();
          });
        });
      });
    });
  }

  function animateParentTabSwitch(fromTab, toTab, elFrom, elTo, mainEl) {
    if (
      prefersReducedMotion() ||
      !elFrom ||
      !elTo ||
      !mainEl ||
      typeof elFrom.animate !== "function" ||
      typeof elTo.animate !== "function"
    ) {
      document.querySelectorAll("#shell-parent > .view").forEach((v) => v.classList.add("view--hidden"));
      elTo.classList.remove("view--hidden");
      return Promise.resolve();
    }

    document.querySelectorAll("#shell-parent > .view").forEach((v) => {
      if (v !== elFrom && v !== elTo) v.classList.add("view--hidden");
    });

    elTo.classList.remove("view--hidden");

    const forward = PARENT_TAB_ORDER.indexOf(toTab) > PARENT_TAB_ORDER.indexOf(fromTab);
    const slide = 22;

    elTo.style.opacity = "0";
    elTo.style.transform = forward
      ? `translate3d(${slide}px,0,0)`
      : `translate3d(-${slide}px,0,0)`;
    void mainEl.offsetHeight;

    const h = Math.max(elFrom.offsetHeight, elTo.offsetHeight, 240);
    mainEl.classList.add("main--view-swap");
    mainEl.style.minHeight = `${h}px`;
    elFrom.style.zIndex = "1";
    elTo.style.zIndex = "2";

    cancelElAnimations(elFrom);
    cancelElAnimations(elTo);

    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const outK = forward
            ? [
                { transform: "translate3d(0,0,0)", opacity: 1 },
                { transform: `translate3d(-${slide}px,0,0)`, opacity: 0 },
              ]
            : [
                { transform: "translate3d(0,0,0)", opacity: 1 },
                { transform: `translate3d(${slide}px,0,0)`, opacity: 0 },
              ];
          const inK = forward
            ? [
                { transform: `translate3d(${slide}px,0,0)`, opacity: 0 },
                { transform: "translate3d(0,0,0)", opacity: 1 },
              ]
            : [
                { transform: `translate3d(-${slide}px,0,0)`, opacity: 0 },
                { transform: "translate3d(0,0,0)", opacity: 1 },
              ];

          const opts = {
            duration: 320,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "forwards",
          };
          const aOut = elFrom.animate(outK, opts);
          const aIn = elTo.animate(inK, opts);

          Promise.all([animPromise(aOut), animPromise(aIn)]).then(() => {
            aOut.cancel();
            aIn.cancel();
            elFrom.classList.add("view--hidden");
            clearModalMotionInline(elFrom);
            clearModalMotionInline(elTo);
            elFrom.style.zIndex = "";
            elTo.style.zIndex = "";
            mainEl.classList.remove("main--view-swap");
            mainEl.style.minHeight = "";
            resolve();
          });
        });
      });
    });
  }

  /**
   * Вход модалки: на мобильных WebKit/CSS-animations часто не стартуют у листа после hidden.
   * Web Animations API + translate3d + двойной rAF дают стабильный результат.
   */
  function beginModalMotion(root) {
    if (!root) return;
    root.classList.remove(MODAL_MOTION_CLASS);

    const sheet = root.querySelector(
      ".auth-modal__sheet, .profile-modal__sheet, .picker__sheet, .lesson-modal__sheet"
    );
    const backdrop = root.querySelector(
      ".auth-modal__backdrop, .profile-modal__backdrop, .picker__backdrop, .lesson-modal__backdrop"
    );

    if (prefersReducedMotion()) {
      clearModalMotionInline(sheet);
      clearModalMotionInline(backdrop);
      root.classList.add(MODAL_MOTION_CLASS);
      return;
    }

    const canWaapi = Boolean(
      sheet && typeof sheet.animate === "function"
    );

    if (canWaapi) {
      cancelElAnimations(sheet);
      cancelElAnimations(backdrop);

      sheet.style.opacity = "0";
      sheet.style.transform = "translate3d(0, 40px, 0)";
      if (backdrop) backdrop.style.opacity = "0";

      void root.offsetHeight;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (backdrop && typeof backdrop.animate === "function") {
            const bAnim = backdrop.animate(
              [{ opacity: 0 }, { opacity: 1 }],
              { duration: 280, easing: "ease-out", fill: "forwards" }
            );
            bAnim.onfinish = () => clearModalMotionInline(backdrop);
          }

          const sAnim = sheet.animate(
            [
              { transform: "translate3d(0, 40px, 0)", opacity: 0 },
              { transform: "translate3d(0, 0, 0)", opacity: 1 },
            ],
            { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
          );
          sAnim.onfinish = () => clearModalMotionInline(sheet);
        });
      });
      return;
    }

    void root.offsetHeight;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.add(MODAL_MOTION_CLASS);
      });
    });
  }

  function endModalMotion(root) {
    if (!root) return;
    root.classList.remove(MODAL_MOTION_CLASS);
    root
      .querySelectorAll(
        ".auth-modal__sheet, .profile-modal__sheet, .picker__sheet, .lesson-modal__sheet, .auth-modal__backdrop, .profile-modal__backdrop, .picker__backdrop, .lesson-modal__backdrop"
      )
      .forEach((el) => {
        cancelElAnimations(el);
        clearModalMotionInline(el);
      });
  }

  function playLandingMotion(root) {
    if (!root || root.hidden) return;
    root.classList.remove(LANDING_MOTION_CLASS);

    const title = root.querySelector(".landing-title");
    const enter = root.querySelector(".landing-enter");

    if (prefersReducedMotion()) {
      clearModalMotionInline(title);
      clearModalMotionInline(enter);
      root.classList.add(LANDING_MOTION_CLASS);
      return;
    }

    if (title && typeof title.animate === "function") {
      cancelElAnimations(title);
      cancelElAnimations(enter);

      title.style.opacity = "0";
      title.style.transform = "translate3d(0, 20px, 0) scale(0.96)";
      if (enter) {
        enter.style.opacity = "0";
        enter.style.transform = "translate3d(0, 20px, 0) scale(0.96)";
      }

      void root.offsetHeight;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const kf = [
            { opacity: 0, transform: "translate3d(0, 20px, 0) scale(0.96)" },
            { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
          ];
          const opt = {
            duration: 520,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "forwards",
          };
          const a1 = title.animate(kf, opt);
          a1.onfinish = () => clearModalMotionInline(title);
          if (enter && typeof enter.animate === "function") {
            const a2 = enter.animate(kf, { ...opt, delay: 110 });
            a2.onfinish = () => clearModalMotionInline(enter);
          }
        });
      });
      return;
    }

    void root.offsetHeight;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.add(LANDING_MOTION_CLASS);
      });
    });
  }

  function showModalFieldError(el, text) {
    if (!el) return;
    if (!text) {
      el.textContent = "";
      el.hidden = true;
      return;
    }
    el.textContent = text;
    el.hidden = false;
  }

  let focusTrapUnload = null;

  function focusableSelector() {
    return 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  }

  function getFocusables(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll(focusableSelector())).filter(
      (node) => node.offsetParent !== null || node.getClientRects().length > 0
    );
  }

  function removeFocusTrap() {
    if (typeof focusTrapUnload === "function") {
      focusTrapUnload();
    }
    focusTrapUnload = null;
  }

  function installFocusTrap(root, onClose) {
    removeFocusTrap();
    const prevFocus = document.activeElement;
    const handler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = getFocusables(root);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    root.addEventListener("keydown", handler);
    focusTrapUnload = () => {
      root.removeEventListener("keydown", handler);
      if (prevFocus && typeof prevFocus.focus === "function") {
        try {
          prevFocus.focus();
        } catch (_) {}
      }
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const nodes = getFocusables(root);
        if (nodes.length) nodes[0].focus();
      });
    });
  }

  function diaryLessonsSkeletonHtml() {
    const rows = [1, 2, 3]
      .map(
        () =>
          '<div class="skeleton-lesson"><div class="skeleton-lesson__title"></div><div class="skeleton-lesson__meta"></div></div>'
      )
      .join("");
    return `<div class="skeleton-diary" aria-busy="true" aria-label="Загрузка расписания">${rows}</div>`;
  }

  function chemTableSkeletonHtml(rows) {
    const n = rows || 6;
    let html = "";
    for (let i = 0; i < n; i++) {
      html +=
        '<tr class="skeleton-row">' +
        '<td><span class="sk-text"></span></td>' +
        '<td><span class="sk-text sk-text--short"></span></td>' +
        '<td><span class="sk-text sk-text--tiny"></span></td>' +
        "</tr>";
    }
    return html;
  }

  function closePickerModal() {
    removeFocusTrap();
    endModalMotion($("#picker"));
    $("#picker").hidden = true;
  }

  function closeTPupilPicker() {
    removeFocusTrap();
    endModalMotion($("#t-pupil-picker"));
    $("#t-pupil-picker").hidden = true;
  }

  function applyPerformanceSubviewVisibility() {
    if (tab === "performance") {
      $("#perf-chart").classList.toggle("view--hidden", perfSubview !== "chart");
      $("#perf-grades").classList.toggle("view--hidden", perfSubview !== "grades");
    }
  }

  function runTabDataLoads() {
    if (tab === "performance" && perfSubview === "chart") loadPerformance();
    if (tab === "performance" && perfSubview === "grades") loadGradesList();
    if (tab === "finals") loadFinals();
    if (tab === "diary") loadDiary();
    if (tab === "meetings") loadParentMeetings();
  }

  function setTab(next) {
    const fromTab = tab;
    const map = {
      diary: "#view-diary",
      performance: "#view-performance",
      meetings: "#view-meetings",
      finals: "#view-finals",
    };
    const mainEl = $("#shell-parent");
    const elFrom = $(map[fromTab]);
    const elTo = $(map[next]);

    tab = next;

    document.querySelectorAll(".bottomnav:not(.bottomnav--teacher) .bn-item").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.tab === next);
    });

    applyPerformanceSubviewVisibility();

    if (fromTab === next) {
      runTabDataLoads();
      return;
    }

    if (!mainEl || !elFrom || !elTo) {
      document.querySelectorAll("#shell-parent > .view").forEach((v) => v.classList.add("view--hidden"));
      elTo.classList.remove("view--hidden");
      runTabDataLoads();
      return;
    }

    animateParentTabSwitch(fromTab, next, elFrom, elTo, mainEl).then(() => {
      runTabDataLoads();
    });
  }

  function openTeacherClassPicker() {
    const titleEl = $("#picker-title");
    if (titleEl) titleEl.textContent = "Выберите класс";
    const renderList = () => {
      const list = $("#picker-list");
      list.innerHTML = "";
      teacherClasses.forEach((c) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = c.id === tClassId ? "is-current" : "";
        btn.innerHTML =
          '<div class="p-name"></div><div class="p-class"></div>';
        btn.querySelector(".p-name").textContent = `Класс ${c.label}`;
        btn.querySelector(".p-class").textContent =
          (teacherProfile && teacherProfile.subject) || "Химия";
        btn.addEventListener("click", () => {
          tClassId = c.id;
          tSelectedPupilKey = null;
          const ps = $("#t-pupil-stats");
          if (ps) ps.innerHTML = "";
          updateTeacherHeader();
          closePickerModal();
          loadTeacherDiaryMeta().then(() => {
            loadTeacherDiary();
            if (tTab === "quarters") loadTeacherQuarterTable();
          });
        });
        li.appendChild(btn);
        list.appendChild(li);
      });
      $("#picker").hidden = false;
      installFocusTrap($("#picker"), closePickerModal);
    };
    if (teacherClasses.length) {
      renderList();
      return;
    }
    api("/api/teacher/classes")
      .then((d) => {
        teacherClasses = d.classes || [];
        if (teacherClasses.length && !teacherClasses.some((x) => x.id === tClassId)) {
          tClassId = teacherClasses[0].id;
        }
        updateTeacherHeader();
        renderList();
      })
      .catch((err) => {
        const msg = getApiErrorMessage(err);
        announceStatus(msg);
        const list = $("#picker-list");
        list.innerHTML =
          '<li><p style="padding:12px;color:#c45;text-align:center"></p></li>';
        const p = list.querySelector("p");
        if (p) p.textContent = msg;
        $("#picker").hidden = false;
        beginModalMotion($("#picker"));
        installFocusTrap($("#picker"), closePickerModal);
      });
  }

  function openPicker() {
    if (appRole === "teacher") {
      openTeacherClassPicker();
      return;
    }
    const titleEl = $("#picker-title");
    if (titleEl) titleEl.textContent = "Кто учится?";
    const list = $("#picker-list");
    list.innerHTML = "";
    children.forEach((c) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = c.id === childId ? "is-current" : "";
      btn.innerHTML =
        '<div class="p-name"></div><div class="p-class"></div>';
      btn.querySelector(".p-name").textContent = c.name;
      btn.querySelector(".p-class").textContent = c.classLabel;
      btn.addEventListener("click", () => {
        childId = c.id;
        $("#hdr-name").textContent = c.name;
        $("#hdr-class").textContent = c.classLabel;
        closePickerModal();
        expandedGradeDate = null;
        perfSubview = "chart";
        $("#perf-chart").classList.remove("view--hidden");
        $("#perf-grades").classList.add("view--hidden");
        loadDiaryMeta().then(() => loadDiary());
        if (tab === "performance") setTab("performance");
        if (tab === "finals") loadFinals();
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
    $("#picker").hidden = false;
    installFocusTrap($("#picker"), closePickerModal);
  }

  function loadChildren() {
    return api("/api/children").then((data) => {
      children = data.children || [];
      const cur = children.find((c) => c.id === childId) || children[0];
      if (cur) {
        childId = cur.id;
        $("#hdr-name").textContent = cur.name;
        $("#hdr-class").textContent = cur.classLabel;
      }
    });
  }

  function loadDiaryMeta() {
    return api(`/api/children/${encodeURIComponent(childId)}/diary/meta`)
      .then((d) => {
        diaryDates = d.dates || [];
        if (diaryDates.length && !diaryDates.includes(diaryDate)) {
          diaryDate = diaryDates[diaryDates.length - 1];
        }
        updateDiaryNavState();
      })
      .catch((err) => {
        announceStatus(getApiErrorMessage(err));
        diaryDates = [];
        updateDiaryNavState();
      });
  }

  function updateDiaryNavState() {
    const prev = $("#diary-prev");
    const next = $("#diary-next");
    if (!prev || !next) return;
    if (!diaryDates.length) {
      prev.disabled = true;
      next.disabled = true;
      return;
    }
    const idx = diaryDates.indexOf(diaryDate);
    if (idx < 0) {
      prev.disabled = true;
      next.disabled = true;
      return;
    }
    prev.disabled = idx <= 0;
    next.disabled = idx >= diaryDates.length - 1;
  }

  function shiftDiary(delta) {
    if (!diaryDates.length) return;
    const idx = diaryDates.indexOf(diaryDate);
    if (idx < 0) {
      diaryDate = diaryDates[0];
      loadDiary();
      return;
    }
    const next = idx + delta;
    if (next < 0 || next >= diaryDates.length) return;
    diaryDate = diaryDates[next];
    loadDiary();
  }

  /**
   * Левая стрелка / свайп вправо: блок уезжает вправо, новый день слева.
   * Правая / свайп влево: уезжает влево, новый справа.
   */
  function shiftDiaryAnimated(delta) {
    if (!diaryDates.length || diaryDayAnimBusy) return;
    const idx = diaryDates.indexOf(diaryDate);
    if (idx < 0) {
      shiftDiary(delta);
      return;
    }
    const n = idx + delta;
    if (n < 0 || n >= diaryDates.length) return;

    const card = $("#diary-card");
    if (prefersReducedMotion() || !card || typeof card.animate !== "function") {
      diaryDate = diaryDates[n];
      loadDiary();
      return;
    }

    diaryDayAnimBusy = true;
    const exitToRight = delta < 0;
    const outK = exitToRight
      ? [
          { transform: "translate3d(0,0,0)", opacity: 1 },
          { transform: "translate3d(36px,0,0)", opacity: 0 },
        ]
      : [
          { transform: "translate3d(0,0,0)", opacity: 1 },
          { transform: "translate3d(-36px,0,0)", opacity: 0 },
        ];

    cancelElAnimations(card);
    const out = card.animate(outK, { duration: 240, easing: "ease-in", fill: "forwards" });
    animPromise(out).then(() => {
      out.cancel();
      clearModalMotionInline(card);
      diaryDate = diaryDates[n];
      const enterEdge = exitToRight ? "left" : "right";
      loadDiary(enterEdge).finally(() => {
        diaryDayAnimBusy = false;
      });
    });
  }

  function barClassForKey(key) {
    const m = {
      teacher: "teacher",
      topic: "topic",
      hw: "hw",
      ctrl: "ctrl",
      place: "place",
      hwNext: "next",
    };
    return m[key] || "teacher";
  }

  function renderLesson(lesson, opts) {
    const teacherEdit = opts && opts.teacherEdit;
    const onlyChemistry = opts && opts.onlyChemistry;
    const hasBlocks = Array.isArray(lesson.blocks) && lesson.blocks.length > 0;
    const detailsFromFields =
      !hasBlocks &&
      (lesson.teacher ||
        lesson.topic ||
        lesson.homework ||
        lesson.controlWork ||
        lesson.place ||
        lesson.homeworkNext);

    const wrap = document.createElement("article");
    wrap.className = "lesson";
    wrap.dataset.lessonId = lesson.id;

    const top = document.createElement("button");
    top.type = "button";
    top.className = "lesson__top";
    top.innerHTML =
      '<div><div class="lesson__title"></div><div class="lesson__time"></div></div>' +
      (lesson.grade != null
        ? '<div class="lesson__grade"></div>'
        : '<div class="lesson__grade" style="opacity:0">—</div>');
    top.querySelector(".lesson__title").textContent = lesson.title;
    top.querySelector(".lesson__time").textContent = lesson.timeLabel;
    if (lesson.grade != null) {
      top.querySelector(".lesson__grade").textContent = String(lesson.grade);
    }

    const body = document.createElement("div");
    body.className = "lesson__body";
    body.hidden = true;

    function fillBody() {
      body.innerHTML = "";
      if (hasBlocks) {
        lesson.blocks.forEach((b) => {
          const row = document.createElement("div");
          row.className = "detail-row";
          const bar = document.createElement("div");
          bar.className =
            "detail-row__bar detail-row__bar--" + barClassForKey(b.key);
          const tx = document.createElement("div");
          tx.className = "detail-row__text";
          tx.textContent = b.text;
          row.appendChild(bar);
          row.appendChild(tx);
          body.appendChild(row);
        });
      } else if (detailsFromFields) {
        const rows = [
          ["teacher", lesson.teacher ? `Преподаватель: ${lesson.teacher}` : ""],
          ["topic", lesson.topic ? `Тема: ${lesson.topic}` : ""],
          ["hw", lesson.homework ? `Домашнее задание: ${lesson.homework}` : ""],
          [
            "ctrl",
            lesson.controlWork ? `Контрольная работа: ${lesson.controlWork}` : "",
          ],
          ["place", lesson.place ? `Место: ${lesson.place}` : ""],
          [
            "next",
            lesson.homeworkNext
              ? `Домашнее задание на следующий урок: ${lesson.homeworkNext}`
              : "",
          ],
        ];
        rows.forEach(([k, text]) => {
          if (!text) return;
          const row = document.createElement("div");
          row.className = "detail-row";
          const bar = document.createElement("div");
          bar.className = "detail-row__bar detail-row__bar--" + barClassForKey(k);
          const tx = document.createElement("div");
          tx.className = "detail-row__text";
          tx.textContent = text;
          row.appendChild(bar);
          row.appendChild(tx);
          body.appendChild(row);
        });
      }
    }

    fillBody();

    let open = false;
    top.addEventListener("click", () => {
      if (!hasBlocks && !detailsFromFields) return;
      open = !open;
      body.hidden = !open;
    });

    wrap.appendChild(top);
    if (hasBlocks || detailsFromFields) wrap.appendChild(body);
    if (teacherEdit && (!onlyChemistry || lesson.title === CHEM_SUBJ)) {
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "lesson__edit";
      edit.textContent = "Изменить";
      edit.addEventListener("click", (e) => {
        e.stopPropagation();
        openLessonModal(lesson);
      });
      wrap.appendChild(edit);
    }
    return wrap;
  }

  function openLessonModal(lesson) {
    editingLesson = lesson;
    showModalFieldError($("#lm-form-error"), "");
    $("#lm-lesson-id").value = lesson.id;
    $("#lm-title-in").value = lesson.title || "";
    $("#lm-time").value = lesson.timeLabel || "";
    $("#lm-teacher").value = lesson.teacher || "";
    $("#lm-topic").value = lesson.topic || "";
    $("#lm-hw").value = lesson.homework || "";
    $("#lm-ctrl").value = lesson.controlWork || "";
    $("#lm-place").value = lesson.place || "";
    $("#lm-hwn").value = lesson.homeworkNext || "";
    $("#lm-grade").value =
      lesson.grade != null && lesson.grade !== "" ? String(lesson.grade) : "";
    $("#lesson-modal").hidden = false;
    beginModalMotion($("#lesson-modal"));
    installFocusTrap($("#lesson-modal"), closeLessonModal);
  }

  function closeLessonModal() {
    removeFocusTrap();
    showModalFieldError($("#lm-form-error"), "");
    endModalMotion($("#lesson-modal"));
    $("#lesson-modal").hidden = true;
    editingLesson = null;
  }

  function setAuthMode(mode) {
    authMode = mode;
    const title = $("#auth-title");
    const form = $("#auth-form");
    const submit = form && form.querySelector(".auth-submit");
    const regExtra = $("#auth-register-extra");
    const loginHints = $("#auth-login-hints");
    const tabLogin = $("#auth-tab-login");
    const tabReg = $("#auth-tab-register");
    const reqRegIds = ["auth-last-name", "auth-first-name", "auth-patronymic"];
    if (mode === "register") {
      if (title) title.textContent = "Регистрация";
      if (submit) submit.textContent = "Создать аккаунт";
      if (regExtra) regExtra.hidden = false;
      if (loginHints) loginHints.hidden = true;
      reqRegIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.required = true;
      });
      if (tabReg) tabReg.classList.add("auth-tab--active");
      if (tabLogin) tabLogin.classList.remove("auth-tab--active");
    } else {
      if (title) title.textContent = "Вход в систему";
      if (submit) submit.textContent = "Войти";
      if (regExtra) regExtra.hidden = true;
      if (loginHints) loginHints.hidden = false;
      reqRegIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.required = false;
      });
      if (tabLogin) tabLogin.classList.add("auth-tab--active");
      if (tabReg) tabReg.classList.remove("auth-tab--active");
    }
  }

  function closeAuthModal() {
    removeFocusTrap();
    const m = $("#auth-modal");
    if (m) {
      endModalMotion(m);
      m.hidden = true;
    }
  }

  function openAuthModal() {
    const err = $("#auth-error");
    if (err) {
      err.textContent = "";
      err.hidden = true;
    }
    const f = $("#auth-form");
    if (f) f.reset();
    setAuthMode("login");
    const m = $("#auth-modal");
    if (m) {
      m.hidden = false;
      beginModalMotion(m);
      installFocusTrap(m, closeAuthModal);
    }
  }

  function profileInitials(lastName, firstName, patronymic) {
    const L = (lastName || "").trim();
    const F = (firstName || "").trim();
    let s = "";
    if (L) s += L[0].toUpperCase();
    if (F) s += F[0].toUpperCase();
    const P = (patronymic || "").trim();
    if (!s && P) s = P[0].toUpperCase();
    return s || "?";
  }

  function setProfileError(msg) {
    const el = $("#profile-modal-error");
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.hidden = false;
    } else {
      el.textContent = "";
      el.hidden = true;
    }
  }

  function closeProfileModal() {
    removeFocusTrap();
    const m = $("#profile-modal");
    if (m) m.hidden = true;
  }

  function renderProfileData(data) {
    const fioLine = $("#profile-fio-line");
    const emailLine = $("#profile-email-line");
    const av = $("#profile-avatar");
    const secP = $("#profile-parent-section");
    const secT = $("#profile-teacher-section");
    const parts = [data.lastName, data.firstName, data.patronymic].filter(
      (x) => String(x || "").trim()
    );
    if (fioLine) fioLine.textContent = parts.length ? parts.join(" ") : "—";
    if (emailLine) emailLine.textContent = data.email || "";
    if (av) {
      av.textContent = profileInitials(
        data.lastName,
        data.firstName,
        data.patronymic
      );
    }
    if (secP) secP.hidden = data.role !== "parent";
    if (secT) secT.hidden = data.role !== "teacher";

    const chList = $("#profile-children-list");
    if (chList && data.role === "parent") {
      chList.innerHTML = "";
      (data.children || []).forEach((c) => {
        const li = document.createElement("li");
        const nm = [c.lastName, c.firstName, c.patronymic]
          .map((x) => String(x || "").trim())
          .filter(Boolean)
          .join(" ");
        li.textContent = nm;
        const sub = document.createElement("span");
        sub.className = "profile-list__sub";
        sub.textContent = c.classLabel || "";
        li.appendChild(sub);
        chList.appendChild(li);
      });
    }

    const clList = $("#profile-classes-list");
    if (clList && data.role === "teacher") {
      clList.innerHTML = "";
      (data.teacherClasses || []).forEach((c) => {
        const li = document.createElement("li");
        li.textContent = c.label;
        if (c.grade != null && c.grade !== "") {
          const sub = document.createElement("span");
          sub.className = "profile-list__sub";
          sub.textContent = `Параллель: ${c.grade}`;
          li.appendChild(sub);
        }
        clList.appendChild(li);
      });
    }
  }

  function openProfileModal() {
    setProfileError("");
    const m = $("#profile-modal");
    api("/api/profile")
      .then((data) => {
        renderProfileData(data);
        if (m) {
          m.hidden = false;
          beginModalMotion(m);
          installFocusTrap(m, closeProfileModal);
        }
      })
      .catch((err) => {
        announceStatus(getApiErrorMessage(err));
      });
  }

  function submitProfileAddChild() {
    setProfileError("");
    const lastEl = $("#prof-child-last");
    const firstEl = $("#prof-child-first");
    const patEl = $("#prof-child-pat");
    const gradeEl = $("#prof-child-grade");
    const letterEl = $("#prof-child-letter");
    const last = lastEl ? String(lastEl.value).trim() : "";
    const first = firstEl ? String(firstEl.value).trim() : "";
    const pat = patEl ? String(patEl.value).trim() : "";
    const grade = gradeEl ? String(gradeEl.value).trim() : "";
    const letter = letterEl ? String(letterEl.value).trim() : "";
    const cls = grade && letter ? `${grade} ${letter}` : "";
    if (!last || !first || !cls) {
      setProfileError("Заполните фамилию, имя, параллель (1–11) и литеру класса (А–Г).");
      return;
    }
    apiPost("/api/profile/children", {
      lastName: last,
      firstName: first,
      patronymic: pat,
      classLabel: cls,
    })
      .then((body) => {
        const chList = $("#profile-children-list");
        if (chList && body.child) {
          const c = body.child;
          const li = document.createElement("li");
          const nm = [c.lastName, c.firstName, c.patronymic]
            .map((x) => String(x || "").trim())
            .filter(Boolean)
            .join(" ");
          li.textContent = nm;
          const sub = document.createElement("span");
          sub.className = "profile-list__sub";
          sub.textContent = c.classLabel || "";
          li.appendChild(sub);
          chList.appendChild(li);
        }
        if (lastEl) lastEl.value = "";
        if (firstEl) firstEl.value = "";
        if (patEl) patEl.value = "";
        if (gradeEl) gradeEl.value = "";
        if (letterEl) letterEl.value = "";
      })
      .catch((err) => setProfileError(getApiErrorMessage(err)));
  }

  function submitProfileAddClass() {
    setProfileError("");
    const grEl = $("#prof-class-grade");
    const letterEl = $("#prof-class-letter");
    const gradeRaw = grEl ? String(grEl.value).trim() : "";
    const letterRaw = letterEl ? String(letterEl.value).trim() : "";
    if (!gradeRaw || !letterRaw) {
      setProfileError("Выберите параллель и литера класса.");
      return;
    }

    const gradeNum = Number(gradeRaw);
    if (!Number.isFinite(gradeNum)) {
      setProfileError("Параллель должна быть числом.");
      return;
    }

    /** @type {Record<string, string | number>} */
    const payload = { label: `${gradeNum} ${letterRaw}`, grade: gradeNum };
    apiPost("/api/profile/classes", payload)
      .then((body) => {
        const clList = $("#profile-classes-list");
        if (clList && body.class) {
          const c = body.class;
          const li = document.createElement("li");
          li.textContent = c.label;
          if (c.grade != null && c.grade !== "") {
            const sub = document.createElement("span");
            sub.className = "profile-list__sub";
            sub.textContent = `Параллель: ${c.grade}`;
            li.appendChild(sub);
          }
          clList.appendChild(li);
        }
        if (grEl) grEl.value = "";
        if (letterEl) letterEl.value = "";
      })
      .catch((err) => setProfileError(getApiErrorMessage(err)));
  }

  function hideAllAppModals() {
    removeFocusTrap();
    [
      "t-cal-modal",
      "t-pupil-picker",
      "student-chem-modal",
      "lesson-modal",
      "picker",
      "auth-modal",
      "profile-modal",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        endModalMotion(el);
        el.hidden = true;
      }
    });
    editingLesson = null;
    editingStudentKey = null;
  }

  function showLanding() {
    hideAllAppModals();
    const landing = $("#shell-landing");
    const app = $("#shell-app");
    if (landing) {
      landing.hidden = false;
      playLandingMotion(landing);
    }
    if (app) app.hidden = true;
    document.body.classList.add("auth-landing");
  }

  function showMainApp() {
    const landing = $("#shell-landing");
    const app = $("#shell-app");
    if (landing) {
      landing.classList.remove(LANDING_MOTION_CLASS);
      landing.querySelectorAll(".landing-title, .landing-enter").forEach((el) => {
        cancelElAnimations(el);
        clearModalMotionInline(el);
      });
      landing.hidden = true;
    }
    if (app) app.hidden = false;
    document.body.classList.remove("auth-landing");
  }

  function logout() {
    apiPost("/api/auth/logout", {})
      .catch(() => {})
      .finally(() => {
        showLanding();
      });
  }

  function applyRole(role) {
    appRole = role === "teacher" ? "teacher" : "parent";

    const shellP = $("#shell-parent");
    const shellT = $("#shell-teacher");
    const nav = document.querySelector(".bottomnav:not(.bottomnav--teacher)");
    const tnav = $("#teacher-bottomnav");
    const op = $("#open-picker");

    if (appRole === "teacher") {
      document.body.classList.add("mode-teacher");
      shellP.classList.add("view--hidden");
      shellT.classList.remove("view--hidden");
      shellT.removeAttribute("hidden");
      if (nav) nav.hidden = true;
      if (tnav) tnav.hidden = false;
      if (op) op.hidden = false;
      document.body.style.paddingBottom = "calc(72px + env(safe-area-inset-bottom, 0))";
    } else {
      document.body.classList.remove("mode-teacher");
      shellP.classList.remove("view--hidden");
      shellT.classList.add("view--hidden");
      shellT.setAttribute("hidden", "");
      if (nav) nav.hidden = false;
      if (tnav) tnav.hidden = true;
      if (op) op.hidden = false;
      document.body.style.paddingBottom = "";
      const cur = children.find((c) => c.id === childId) || children[0];
      if (cur) {
        $("#hdr-name").textContent = cur.name;
        $("#hdr-class").textContent = cur.classLabel;
      }
    }
  }

  function bootstrapAfterLogin(role) {
    applyRole(role === "teacher" ? "teacher" : "parent");
    if (role === "teacher") {
      initTeacherShell();
    } else {
      loadChildren()
        .then(() => loadDiaryMeta())
        .then(() => {
          loadDiary();
          setTab("diary");
        });
    }
  }

  function updateTeacherHeader() {
    const c = teacherClasses.find((x) => x.id === tClassId);
    if (c) {
      $("#hdr-name").textContent = `Класс ${c.label}`;
      $("#hdr-class").textContent =
        (teacherProfile && teacherProfile.subject) || "Химия";
    }
  }

  function updateTeacherDiaryNavState() {
    const prev = $("#t-diary-prev");
    const next = $("#t-diary-next");
    if (!prev || !next) return;
    if (!tDiaryDates.length) {
      prev.disabled = true;
      next.disabled = true;
      return;
    }
    const idx = tDiaryDates.indexOf(tDiaryDate);
    if (idx < 0) {
      prev.disabled = true;
      next.disabled = true;
      return;
    }
    prev.disabled = idx <= 0;
    next.disabled = idx >= tDiaryDates.length - 1;
  }

  function shiftTeacherDiary(delta) {
    if (!tDiaryDates.length) return;
    const idx = tDiaryDates.indexOf(tDiaryDate);
    if (idx < 0) {
      tDiaryDate = tDiaryDates[0];
      loadTeacherDiary();
      return;
    }
    const n = idx + delta;
    if (n < 0 || n >= tDiaryDates.length) return;
    tDiaryDate = tDiaryDates[n];
    loadTeacherDiary();
  }

  function shiftTeacherDiaryAnimated(delta) {
    if (!tDiaryDates.length || teacherDiaryDayAnimBusy) return;
    const idx = tDiaryDates.indexOf(tDiaryDate);
    if (idx < 0) {
      shiftTeacherDiary(delta);
      return;
    }
    const n = idx + delta;
    if (n < 0 || n >= tDiaryDates.length) return;

    const card = $("#t-diary-card");
    if (prefersReducedMotion() || !card || typeof card.animate !== "function") {
      tDiaryDate = tDiaryDates[n];
      loadTeacherDiary();
      return;
    }

    teacherDiaryDayAnimBusy = true;
    const exitToRight = delta < 0;
    const outK = exitToRight
      ? [
          { transform: "translate3d(0,0,0)", opacity: 1 },
          { transform: "translate3d(36px,0,0)", opacity: 0 },
        ]
      : [
          { transform: "translate3d(0,0,0)", opacity: 1 },
          { transform: "translate3d(-36px,0,0)", opacity: 0 },
        ];

    cancelElAnimations(card);
    const out = card.animate(outK, { duration: 240, easing: "ease-in", fill: "forwards" });
    animPromise(out).then(() => {
      out.cancel();
      clearModalMotionInline(card);
      tDiaryDate = tDiaryDates[n];
      const enterEdge = exitToRight ? "left" : "right";
      loadTeacherDiary(enterEdge).finally(() => {
        teacherDiaryDayAnimBusy = false;
      });
    });
  }

  function padIsoPart(n) {
    return String(n).padStart(2, "0");
  }

  function isoFromYmd(y, m1, d) {
    return `${y}-${padIsoPart(m1)}-${padIsoPart(d)}`;
  }

  function parseIsoParts(iso) {
    const a = String(iso).split("-").map(Number);
    return { y: a[0], m: a[1], d: a[2] };
  }

  function isWeekendYmd(y, month0, day) {
    const dt = new Date(y, month0, day, 12, 0, 0);
    const w = dt.getDay();
    return w === 0 || w === 6;
  }

  function renderTeacherCalendar() {
    const title = $("#t-cal-title");
    const grid = $("#t-cal-grid");
    if (!title || !grid) return;
    const y = tCalViewYear;
    const m0 = tCalViewMonth;
    const mid = new Date(y, m0, 15, 12, 0, 0);
    title.textContent = mid.toLocaleDateString("ru-RU", {
      month: "long",
      year: "numeric",
    });
    grid.innerHTML = "";
    const hasSchoolSet = tDiaryDates.length > 0;
    const dim = new Date(y, m0 + 1, 0, 12, 0, 0).getDate();
    const firstDow = new Date(y, m0, 1, 12, 0, 0).getDay();
    const lead = (firstDow + 6) % 7;

    for (let i = 0; i < lead; i++) {
      const pad = document.createElement("div");
      pad.className = "t-cal-pad";
      grid.appendChild(pad);
    }
    for (let d = 1; d <= dim; d++) {
      const iso = isoFromYmd(y, m0 + 1, d);
      const wknd = isWeekendYmd(y, m0, d);
      const inSchool = !hasSchoolSet || tDiaryDates.indexOf(iso) >= 0;
      const isSel = iso === tDiaryDate;

      if (wknd) {
        const cell = document.createElement("div");
        cell.className = "t-cal-cell t-cal-cell--weekend";
        cell.textContent = String(d);
        cell.title = "Выходной";
        grid.appendChild(cell);
      } else if (!inSchool) {
        const cell = document.createElement("div");
        cell.className = "t-cal-cell t-cal-cell--off";
        cell.textContent = String(d);
        cell.title = "Нет учебного дня";
        grid.appendChild(cell);
      } else {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className =
          "t-cal-cell t-cal-cell--day" + (isSel ? " is-selected" : "");
        btn.textContent = String(d);
        btn.addEventListener("click", () => {
          tDiaryDate = iso;
          closeTeacherCalendar();
          loadTeacherDiary();
        });
        grid.appendChild(btn);
      }
    }
  }

  function openTeacherCalendar() {
    const p = parseIsoParts(tDiaryDate);
    if (p.y && p.m) {
      tCalViewYear = p.y;
      tCalViewMonth = p.m - 1;
    } else {
      tCalViewYear = 2026;
      tCalViewMonth = 2;
    }
    renderTeacherCalendar();
    const modal = $("#t-cal-modal");
    if (modal) {
      modal.hidden = false;
      beginModalMotion(modal);
      installFocusTrap(modal, closeTeacherCalendar);
    }
  }

  function closeTeacherCalendar() {
    removeFocusTrap();
    const modal = $("#t-cal-modal");
    if (modal) {
      endModalMotion(modal);
      modal.hidden = true;
    }
  }

  function setTeacherTab(next) {
    tTab = next;
    document.querySelectorAll(".t-view").forEach((v) => v.classList.add("view--hidden"));
    const map = {
      diary: "#t-view-diary",
      pupil: "#t-view-pupil",
      tmeet: "#t-view-tmeet",
      quarters: "#t-view-quarters",
    };
    const sec = $(map[next]);
    if (sec) sec.classList.remove("view--hidden");
    document.querySelectorAll("#teacher-bottomnav .bn-item").forEach((b) => {
      const tab = b.getAttribute("data-teacher-tab");
      b.classList.toggle("is-active", tab === next);
    });
    if (next === "quarters") loadTeacherQuarterTable();
    if (next === "pupil" && tSelectedPupilKey) loadTutorPupilStats();
    if (next === "tmeet") {
      const di = $("#t-meeting-date");
      const ti = $("#t-meeting-time");
      if (di && !di.value) di.value = "2026-04-10";
      if (ti && !ti.value) ti.value = "18:00";
      loadTeacherMeetings();
    }
  }

  function loadChemTable() {
    const tbody = $("#t-chem-tbody");
    if (!tbody) return;
    tbody.innerHTML = chemTableSkeletonHtml();
    tbody.setAttribute("aria-busy", "true");
    api(
      `/api/teacher/classes/${encodeURIComponent(tClassId)}/chemistry-day/${encodeURIComponent(
        tDiaryDate
      )}`
    )
      .then((d) => {
        tbody.removeAttribute("aria-busy");
        tbody.innerHTML = "";
        (d.students || []).forEach((s) => {
          const tr = document.createElement("tr");
          tr.dataset.studentKey = s.studentKey;
          const tdN = document.createElement("td");
          tdN.textContent = s.name;
          const tdG = document.createElement("td");
          tdG.textContent = s.lessonGrade != null ? String(s.lessonGrade) : "—";
          const tdA = document.createElement("td");
          tdA.textContent = s.absent ? "н" : "";
          if (s.absent) tdA.classList.add("cell-miss");
          tr.appendChild(tdN);
          tr.appendChild(tdG);
          tr.appendChild(tdA);
          tr.addEventListener("click", () => openStudentChemModal(s));
          tbody.appendChild(tr);
        });
      })
      .catch((err) => {
        tbody.removeAttribute("aria-busy");
        const msg = getApiErrorMessage(err);
        announceStatus(msg);
        tbody.innerHTML =
          '<tr><td colspan="3" style="text-align:center;color:#c45"></td></tr>';
        const td = tbody.querySelector("td");
        if (td) td.textContent = msg;
      });
  }

  function syncStudentChemGradeDisabled() {
    const sel = $("#scm-grade");
    const absent = $("#scm-absent").checked;
    if (!sel) return;
    sel.disabled = absent;
    if (absent) sel.value = "";
  }

  function openStudentChemModal(s) {
    editingStudentKey = s.studentKey;
    $("#scm-title").textContent = s.name;
    showModalFieldError($("#scm-form-error"), "");
    $("#scm-absent").checked = Boolean(s.absent);
    $("#scm-grade").value =
      s.absent || s.lessonGrade == null ? "" : String(s.lessonGrade);
    syncStudentChemGradeDisabled();
    $("#student-chem-modal").hidden = false;
    beginModalMotion($("#student-chem-modal"));
    installFocusTrap($("#student-chem-modal"), closeStudentChemModal);
  }

  function closeStudentChemModal() {
    removeFocusTrap();
    showModalFieldError($("#scm-form-error"), "");
    endModalMotion($("#student-chem-modal"));
    $("#student-chem-modal").hidden = true;
    editingStudentKey = null;
  }

  function loadTeacherQuarterTable() {
    const thead = $("#t-quarters-thead");
    const tbody = $("#t-quarters-tbody");
    const hint = $("#t-quarter-hint");
    if (!thead || !tbody) return;
    api(`/api/teacher/classes/${encodeURIComponent(tClassId)}/quarter-stats`).then((d) => {
      if (hint) {
        hint.textContent = `Текущая четверть: ${d.currentQuarter}. Закрытые четверти — целая оценка; за текущую — средний балл с двумя знаками.`;
      }
      thead.innerHTML = `<tr><th>Фамилия Имя</th><th>1 ч.</th><th>2 ч.</th><th>3 ч.</th><th>4 ч.</th></tr>`;
      tbody.innerHTML = "";
      (d.rows || []).forEach((row) => {
        const tr = document.createElement("tr");
        const tdn = document.createElement("td");
        tdn.textContent = row.name;
        tr.appendChild(tdn);
        row.cells.forEach((cell) => {
          const td = document.createElement("td");
          td.textContent = cell;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    });
  }

  function loadTutorPupilStats() {
    const box = $("#t-pupil-stats");
    if (!box || !tSelectedPupilKey) return;
    box.innerHTML = '<p style="color:#6b7a90">Загрузка…</p>';
    api(
      `/api/teacher/classes/${encodeURIComponent(tClassId)}/students/${encodeURIComponent(
        tSelectedPupilKey
      )}/stats`
    )
      .then((st) => {
        const chem = st.chemistry;
        let html = `<div class="stat-block"><h4>${chem.label}</h4>`;
        html += `<p>Средний балл: <strong>${chem.average.toFixed(2)}</strong></p>`;
        html += `<p style="font-size:0.85rem;color:#6b7a90">Оценки (пример): ${chem.grades.join(", ")}</p></div>`;
        html += '<div class="stat-block"><h4>Все предметы</h4>';
        st.subjects.forEach((sub) => {
          html += `<div class="stat-row"><span>${sub.name}</span><span>${sub.average.toFixed(2)} (${sub.gradesCount} оц.)</span></div>`;
        });
        html += "</div>";
        box.innerHTML = html;
      })
      .catch((err) => {
        const msg = getApiErrorMessage(err);
        announceStatus(msg);
        box.innerHTML = '<p class="placeholder-msg"></p>';
        const p = box.querySelector(".placeholder-msg");
        if (p) p.textContent = msg;
      });
  }

  function compareRosterByLastName(a, b) {
    const partsA = String(a.name).trim().split(/\s+/);
    const partsB = String(b.name).trim().split(/\s+/);
    const lastA = partsA[0] || "";
    const lastB = partsB[0] || "";
    const ln = lastA.localeCompare(lastB, "ru", { sensitivity: "base" });
    if (ln !== 0) return ln;
    const firstA = partsA.slice(1).join(" ");
    const firstB = partsB.slice(1).join(" ");
    return firstA.localeCompare(firstB, "ru", { sensitivity: "base" });
  }

  function fillTutorPupilPicker() {
    const list = $("#t-pupil-list");
    if (!list) return;
    list.innerHTML = "";
    api(`/api/teacher/classes/${encodeURIComponent(tClassId)}/roster`).then((d) => {
      const names = d.names || [];
      const indexed = names.map((name, rosterIndex) => ({ name, rosterIndex }));
      indexed.sort(compareRosterByLastName);
      indexed.forEach(({ name, rosterIndex }) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        const key = String(rosterIndex);
        btn.className = key === tSelectedPupilKey ? "is-current" : "";
        btn.innerHTML = '<div class="p-name"></div>';
        btn.querySelector(".p-name").textContent = name;
        btn.addEventListener("click", () => {
          tSelectedPupilKey = key;
          closeTPupilPicker();
          loadTutorPupilStats();
        });
        li.appendChild(btn);
        list.appendChild(li);
      });
    });
  }

  function renderMeetingRow(tbody, m) {
    const tr = document.createElement("tr");
    const tdDate = document.createElement("td");
    const tdTime = document.createElement("td");
    const tdTopic = document.createElement("td");
    const dFmt = dateFromIsoCalendar(m.date);
    const dateStr = dFmt.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    tdDate.textContent = dateStr;
    tdTime.textContent = m.time || "—";
    tdTopic.textContent = m.topic || "";
    tr.appendChild(tdDate);
    tr.appendChild(tdTime);
    tr.appendChild(tdTopic);
    tbody.appendChild(tr);
  }

  function loadMeetingsTable(endpoint, tbodySel, emptySel, msgSel) {
    const tbody = $(tbodySel);
    const empty = $(emptySel);
    const msg = $(msgSel);
    if (!tbody) return;

    if (msg) msg.hidden = false;
    if (empty) empty.hidden = true;
    tbody.innerHTML = "";

    return api(endpoint)
      .then((d) => {
        if (msg) msg.hidden = true;
        const m = d.meeting;
        if (!m) {
          if (empty) empty.hidden = false;
          return;
        }
        if (empty) empty.hidden = true;
        renderMeetingRow(tbody, m);
      })
      .catch((err) => {
        const emsg = getApiErrorMessage(err);
        announceStatus(emsg);
        if (msg) {
          msg.textContent = emsg;
          msg.hidden = false;
        }
        if (empty) empty.hidden = false;
      });
  }

  function loadParentMeetings() {
    return loadMeetingsTable(
      `/api/children/${encodeURIComponent(childId)}/meeting`,
      "#meetings-tbody",
      "#meetings-empty",
      "#meetings-msg"
    );
  }

  function loadTeacherMeetings() {
    return loadMeetingsTable(
      `/api/teacher/classes/${encodeURIComponent(tClassId)}/meeting`,
      "#t-meetings-tbody",
      "#t-meetings-empty",
      "#t-meetings-msg"
    );
  }

  function loadTeacherDiaryMeta() {
    return api(`/api/teacher/classes/${encodeURIComponent(tClassId)}/diary?date=${encodeURIComponent(tDiaryDate)}`)
      .then((d) => {
        tDiaryDates = d.dates || [];
        if (tDiaryDates.length && !tDiaryDates.includes(tDiaryDate)) {
          tDiaryDate = tDiaryDates[tDiaryDates.length - 1];
        }
        updateTeacherDiaryNavState();
      })
      .catch((err) => {
        announceStatus(getApiErrorMessage(err));
        tDiaryDates = [];
        updateTeacherDiaryNavState();
      });
  }

  function loadTeacherDiary(enterFrom) {
    const lessonsEl = $("#t-lessons");
    const card = $("#t-diary-card");
    if (!lessonsEl) return Promise.resolve();
    lessonsEl.innerHTML = diaryLessonsSkeletonHtml();
    lessonsEl.setAttribute("aria-busy", "true");
    return api(
      `/api/teacher/classes/${encodeURIComponent(tClassId)}/diary?date=${encodeURIComponent(
        tDiaryDate
      )}`
    )
      .then((d) => {
        lessonsEl.removeAttribute("aria-busy");
        tDiaryDates = d.dates || tDiaryDates;
        const day = d.day;
        $("#t-day-num").textContent = String(dateFromIsoCalendar(day.date).getDate());
        $("#t-weekday").textContent = day.weekday;
        $("#t-month-y").textContent = `${day.monthGenitive}, ${day.year}`;
        lessonsEl.innerHTML = "";
        const chemOnly = day.lessons.filter((les) => les.title === CHEM_SUBJ);
        chemOnly.forEach((les) => {
          lessonsEl.appendChild(
            renderLesson(les, { teacherEdit: true, onlyChemistry: true })
          );
        });
        updateTeacherDiaryNavState();
        loadChemTable();
        if (enterFrom === "left" || enterFrom === "right") {
          return runSlideEnter(card, enterFrom === "left");
        }
        return undefined;
      })
      .catch((err) => {
        clearModalMotionInline(card);
        lessonsEl.removeAttribute("aria-busy");
        const msg = getApiErrorMessage(err);
        announceStatus(msg);
        lessonsEl.innerHTML =
          '<p style="text-align:center;color:#c45;font-size:0.88rem"></p>';
        const p = lessonsEl.querySelector("p");
        if (p) p.textContent = msg;
        const tbody = $("#t-chem-tbody");
        if (tbody) {
          tbody.removeAttribute("aria-busy");
          tbody.innerHTML = "";
        }
        updateTeacherDiaryNavState();
      });
  }

  function initTeacherShell() {
    tTab = "diary";
    setTeacherTab("diary");
    return api("/api/teacher/profile")
      .then((p) => {
        teacherProfile = p;
        const line = $("#teacher-profile");
        if (line) line.textContent = `${p.name} — ${p.subject}`;
        return api("/api/teacher/classes");
      })
      .then((d) => {
        teacherClasses = d.classes || [];
        if (teacherClasses.length && !teacherClasses.some((c) => c.id === tClassId)) {
          tClassId = teacherClasses[0].id;
        }
        tDiaryDate = diaryDate;
        updateTeacherHeader();
        return loadTeacherDiaryMeta();
      })
      .then(() => {
        loadTeacherDiary();
      });
  }

  function attachDiarySwipe(el, shiftFn) {
    const shift = typeof shiftFn === "function" ? shiftFn : shiftDiary;
    let x0 = null;
    let y0 = null;
    el.addEventListener(
      "touchstart",
      (e) => {
        if (!e.touches.length) return;
        x0 = e.touches[0].clientX;
        y0 = e.touches[0].clientY;
      },
      { passive: true }
    );
    el.addEventListener(
      "touchend",
      (e) => {
        if (x0 == null || !e.changedTouches.length) return;
        const x1 = e.changedTouches[0].clientX;
        const y1 = e.changedTouches[0].clientY;
        const dx = x1 - x0;
        const dy = y1 - y0;
        x0 = null;
        y0 = null;
        if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
        if (dx < 0) shift(1);
        else shift(-1);
      },
      { passive: true }
    );
  }

  function loadDiary(enterFrom) {
    const lessonsEl = $("#diary-lessons");
    const card = $("#diary-card");
    lessonsEl.innerHTML = diaryLessonsSkeletonHtml();
    lessonsEl.setAttribute("aria-busy", "true");
    return api(
      `/api/children/${encodeURIComponent(childId)}/diary?date=${encodeURIComponent(
        diaryDate
      )}`
    )
      .then((d) => {
        lessonsEl.removeAttribute("aria-busy");
        diaryDates = d.dates || diaryDates;
        const day = d.day;
        $("#diary-day-num").textContent = String(dateFromIsoCalendar(day.date).getDate());
        $("#diary-weekday").textContent = day.weekday;
        $("#diary-month-y").textContent = `${day.monthGenitive}, ${day.year}`;
        lessonsEl.innerHTML = "";
        day.lessons.forEach((les) => lessonsEl.appendChild(renderLesson(les)));
        updateDiaryNavState();
        if (enterFrom === "left" || enterFrom === "right") {
          return runSlideEnter(card, enterFrom === "left");
        }
        return undefined;
      })
      .catch((err) => {
        clearModalMotionInline(card);
        lessonsEl.removeAttribute("aria-busy");
        const msg = getApiErrorMessage(err);
        announceStatus(msg);
        lessonsEl.innerHTML =
          '<p style="text-align:center;color:#c45;font-size:0.88rem"></p>';
        const p = lessonsEl.querySelector("p");
        if (p) p.textContent = msg;
        updateDiaryNavState();
      });
  }

  function loadPerformance() {
    api(`/api/children/${encodeURIComponent(childId)}/performance`).then((p) => {
      $("#perf-date-line").textContent = p.dateLabel;
      $("#perf-trimester").textContent = p.trimesterLabel;
      const box = $("#perf-rows");
      box.innerHTML = "";
      p.rows.forEach((row) => {
        const max = 5;
        const b = document.createElement("button");
        b.type = "button";
        b.className = "perf-row";
        const name = document.createElement("div");
        name.className = "perf-row__name";
        name.textContent = row.subjectName;
        const bars = document.createElement("div");
        bars.className = "bars";
        [
          ["stu", row.studentAvg, "bar-fill--stu", "bar-val--stu"],
          ["cls", row.classAvg, "bar-fill--cls", "bar-val--cls"],
          ["par", row.parallelAvg, "bar-fill--par", "bar-val--par"],
        ].forEach(([_, val, fc, vc]) => {
          const line = document.createElement("div");
          line.className = "bar-line";
          const track = document.createElement("div");
          track.className = "bar-track";
          const fill = document.createElement("div");
          fill.className = "bar-fill " + fc;
          const pct = Math.min(100, Math.max(0, (Number(val) / max) * 100));
          fill.style.width = pct + "%";
          track.appendChild(fill);
          const num = document.createElement("span");
          num.className = "bar-val " + vc;
          num.textContent = Number(val).toFixed(2);
          line.appendChild(track);
          line.appendChild(num);
          bars.appendChild(line);
        });
        b.appendChild(name);
        b.appendChild(bars);
        b.addEventListener("click", () => {
          gradesSubjectId = row.subjectId;
          perfSubview = "grades";
          expandedGradeDate = null;
          $("#perf-chart").classList.add("view--hidden");
          $("#perf-grades").classList.remove("view--hidden");
          loadGradesList();
        });
        box.appendChild(b);
      });
    })
      .catch((err) => {
        const msg = getApiErrorMessage(err);
        announceStatus(msg);
        $("#perf-date-line").textContent = "—";
        $("#perf-trimester").textContent = "";
        const box = $("#perf-rows");
        if (box) {
          box.innerHTML = '<p class="placeholder-msg"></p>';
          const p = box.querySelector(".placeholder-msg");
          if (p) p.textContent = msg;
        }
      });
  }

  function loadGradesList() {
    api(
      `/api/children/${encodeURIComponent(childId)}/grades?subject=${encodeURIComponent(
        gradesSubjectId
      )}`
    ).then((g) => {
      $("#grades-banner-date").textContent =
        document.getElementById("perf-date-line").textContent || "";
      $("#grades-subject-title").textContent = g.subjectLabel || "Предмет";
      const list = $("#grades-list");
      list.innerHTML = "";
      (g.rows || []).forEach((row) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "gline";
        const isOpen = expandedGradeDate === row.date;
        btn.innerHTML =
          '<div class="gline__row">' +
          '<span class="gline__dot"></span>' +
          '<span class="gline__date"></span>' +
          '<span class="gline__grades"></span>' +
          "</div>";
        btn.querySelector(".gline__date").textContent = row.dateDisplay + ":";
        btn.querySelector(".gline__grades").textContent = row.grades.join(", ");

        const detailBox = document.createElement("div");
        detailBox.className = "gline__detail";
        detailBox.hidden = !isOpen;

        btn.addEventListener("click", () => {
          if (expandedGradeDate === row.date) {
            expandedGradeDate = null;
            detailBox.hidden = true;
            return;
          }
          list.querySelectorAll(".gline__detail").forEach((el) => {
            el.hidden = true;
          });
          expandedGradeDate = row.date;
          detailBox.hidden = false;
          detailBox.innerHTML = "Загрузка…";
          api(
            `/api/children/${encodeURIComponent(childId)}/grades/${encodeURIComponent(
              row.date
            )}?subject=${encodeURIComponent(gradesSubjectId)}`
          )
            .then((d) => {
              detailBox.innerHTML = "";
              d.detail.items.forEach((it) => {
                const line = document.createElement("div");
                line.className = "gdetail";
                line.innerHTML =
                  '<div><div class="gdetail__subj"></div><div class="gdetail__act"></div></div><div class="gdetail__gr"></div>';
                line.querySelector(".gdetail__subj").textContent = it.subject;
                line.querySelector(".gdetail__act").textContent = it.activity;
                line.querySelector(".gdetail__gr").textContent = String(it.grade);
                detailBox.appendChild(line);
              });
            })
            .catch((err) => {
              const msg = getApiErrorMessage(err);
              announceStatus(msg);
              detailBox.textContent = msg;
            });
        });

        const rowWrap = document.createElement("div");
        rowWrap.appendChild(btn);
        rowWrap.appendChild(detailBox);
        list.appendChild(rowWrap);
      });
    });
  }

  function loadFinals() {
    api(`/api/children/${encodeURIComponent(childId)}/finals`).then((f) => {
      $("#finals-year").textContent = f.yearLabel;
      const box = $("#finals-rows");
      box.innerHTML = "";
      f.rows.forEach((r) => {
        const row = document.createElement("div");
        row.className = "frow";
        const name = document.createElement("div");
        name.className = "frow__name";
        name.textContent = r.subject;
        row.appendChild(name);
        [r.t1, r.t2, r.t3, r.year].forEach((v) => {
          const c = document.createElement("div");
          c.className = "frow__g";
          c.textContent = v != null ? String(v) : "—";
          row.appendChild(c);
        });
        box.appendChild(row);
      });
    });
  }

  document.querySelectorAll(".bottomnav:not(.bottomnav--teacher) .bn-item").forEach((b) => {
    b.addEventListener("click", () => {
      const next = b.dataset.tab;
      if (!next) return;
      if (next === "performance") {
        perfSubview = "chart";
        expandedGradeDate = null;
        $("#perf-chart").classList.remove("view--hidden");
        $("#perf-grades").classList.add("view--hidden");
      }
      setTab(next);
    });
  });

  $("#open-picker").addEventListener("click", openPicker);
  $("#picker-close").addEventListener("click", closePickerModal);
  $(".picker__backdrop").addEventListener("click", closePickerModal);

  $("#grades-back").addEventListener("click", () => {
    perfSubview = "chart";
    expandedGradeDate = null;
    $("#perf-chart").classList.remove("view--hidden");
    $("#perf-grades").classList.add("view--hidden");
    loadPerformance();
  });

  $("#diary-prev").addEventListener("click", () => shiftDiaryAnimated(-1));
  $("#diary-next").addEventListener("click", () => shiftDiaryAnimated(1));
  attachDiarySwipe($("#diary-card"), shiftDiaryAnimated);

  $("#t-diary-prev").addEventListener("click", () => shiftTeacherDiaryAnimated(-1));
  $("#t-diary-next").addEventListener("click", () => shiftTeacherDiaryAnimated(1));
  attachDiarySwipe($("#t-diary-card"), shiftTeacherDiaryAnimated);

  const tCalOpen = $("#t-cal-open");
  if (tCalOpen) tCalOpen.addEventListener("click", openTeacherCalendar);
  const tCalBd = $("#t-cal-backdrop");
  if (tCalBd) tCalBd.addEventListener("click", closeTeacherCalendar);
  const tCalClose = $("#t-cal-close");
  if (tCalClose) tCalClose.addEventListener("click", closeTeacherCalendar);
  const tCalPrev = $("#t-cal-prev");
  if (tCalPrev) {
    tCalPrev.addEventListener("click", () => {
      tCalViewMonth -= 1;
      if (tCalViewMonth < 0) {
        tCalViewMonth = 11;
        tCalViewYear -= 1;
      }
      renderTeacherCalendar();
    });
  }
  const tCalNext = $("#t-cal-next");
  if (tCalNext) {
    tCalNext.addEventListener("click", () => {
      tCalViewMonth += 1;
      if (tCalViewMonth > 11) {
        tCalViewMonth = 0;
        tCalViewYear += 1;
      }
      renderTeacherCalendar();
    });
  }

  $("#lm-cancel").addEventListener("click", closeLessonModal);
  document.querySelectorAll("#lesson-modal .lesson-modal__backdrop").forEach((el) => {
    el.addEventListener("click", closeLessonModal);
  });

  document.querySelectorAll("#teacher-bottomnav .bn-item").forEach((b) => {
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const next = b.getAttribute("data-teacher-tab");
      if (next) setTeacherTab(next);
    });
  });

  $("#t-open-pupil-picker").addEventListener("click", () => {
    fillTutorPupilPicker();
    const pup = $("#t-pupil-picker");
    if (pup) {
      pup.hidden = false;
      beginModalMotion(pup);
      installFocusTrap(pup, closeTPupilPicker);
    }
  });
  $("#t-pupil-picker-close").addEventListener("click", closeTPupilPicker);
  $("#t-pupil-picker-backdrop").addEventListener("click", closeTPupilPicker);

  $("#t-meeting-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const date = $("#t-meeting-date").value;
    const time = $("#t-meeting-time").value;
    const topic = $("#t-meeting-topic").value.trim();
    apiPost(`/api/teacher/classes/${encodeURIComponent(tClassId)}/meeting`, {
      date,
      time,
      topic,
    })
      .then(() => {
        const ok = "Собрание сохранено. Родители увидят его во вкладке «Собрание».";
        announceStatus(ok);
        alert(ok);
        $("#t-meeting-form").reset();
        loadTeacherMeetings();
      })
      .catch((err) => {
        const msg = getApiErrorMessage(err);
        announceStatus(msg);
        alert(msg);
      });
  });

  $("#scm-cancel").addEventListener("click", closeStudentChemModal);
  $("#student-chem-backdrop").addEventListener("click", closeStudentChemModal);
  $("#scm-absent").addEventListener("change", syncStudentChemGradeDisabled);
  $("#scm-grade").addEventListener("change", () => {
    if ($("#scm-grade").value) $("#scm-absent").checked = false;
    syncStudentChemGradeDisabled();
  });
  $("#scm-save").addEventListener("click", () => {
    if (!editingStudentKey) return;
    showModalFieldError($("#scm-form-error"), "");
    const raw = $("#scm-grade").value;
    const absent = $("#scm-absent").checked;
    const lessonGrade =
      absent || raw === "" ? null : Number(raw);
    apiPut(
      `/api/teacher/classes/${encodeURIComponent(tClassId)}/chemistry-day/${encodeURIComponent(
        tDiaryDate
      )}/students/${encodeURIComponent(editingStudentKey)}`,
      { lessonGrade, absent }
    )
      .then(() => {
        closeStudentChemModal();
        loadChemTable();
      })
      .catch((err) => {
        const msg = getApiErrorMessage(err);
        announceStatus(msg);
        showModalFieldError($("#scm-form-error"), msg);
      });
  });

  $("#lesson-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!editingLesson) return;
    showModalFieldError($("#lm-form-error"), "");
    const gradeRaw = $("#lm-grade").value.trim();
    const body = {
      title: $("#lm-title-in").value,
      timeLabel: $("#lm-time").value,
      teacher: $("#lm-teacher").value || null,
      topic: $("#lm-topic").value || null,
      homework: $("#lm-hw").value || null,
      controlWork: $("#lm-ctrl").value || null,
      place: $("#lm-place").value || null,
      homeworkNext: $("#lm-hwn").value || null,
      grade: gradeRaw === "" ? null : Number(gradeRaw),
    };
    const key = encodeURIComponent(String(editingLesson.id));
    apiPut(
      `/api/teacher/classes/${encodeURIComponent(tClassId)}/diary/${encodeURIComponent(
        tDiaryDate
      )}/lessons/${key}`,
      body
    )
      .then(() => {
        closeLessonModal();
        loadTeacherDiary();
      })
      .catch((err) => {
        const msg = getApiErrorMessage(err);
        announceStatus(msg);
        showModalFieldError($("#lm-form-error"), msg);
      });
  });

  $("#open-auth").addEventListener("click", () => openAuthModal());
  $("#auth-cancel").addEventListener("click", () => closeAuthModal());
  $("#auth-backdrop").addEventListener("click", () => closeAuthModal());
  const tabLogin = $("#auth-tab-login");
  const tabReg = $("#auth-tab-register");
  if (tabLogin) tabLogin.addEventListener("click", () => setAuthMode("login"));
  if (tabReg) tabReg.addEventListener("click", () => setAuthMode("register"));

  $("#auth-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const emailIn = $("#auth-email");
    const passIn = $("#auth-password");
    const err = $("#auth-error");
    const email = emailIn ? String(emailIn.value).trim() : "";
    const password = passIn ? String(passIn.value) : "";
    if (err) {
      err.textContent = "";
      err.hidden = true;
    }
    const path =
      authMode === "register" ? "/api/auth/register" : "/api/auth/login";
    const roleSel = $("#auth-role");
    /** @type {Record<string, string>} */
    const payload =
      authMode === "register"
        ? {
            email,
            password,
            role: roleSel && roleSel.value === "teacher" ? "teacher" : "parent",
            lastName: ($("#auth-last-name") && $("#auth-last-name").value) || "",
            firstName: ($("#auth-first-name") && $("#auth-first-name").value) || "",
            patronymic: ($("#auth-patronymic") && $("#auth-patronymic").value) || "",
          }
        : { email, password };

    apiPost(path, payload)
      .then((body) => {
        const role = body && body.user && body.user.role;
        if (role !== "parent" && role !== "teacher") {
          throw new Error("Некорректный ответ сервера");
        }
        closeAuthModal();
        showMainApp();
        bootstrapAfterLogin(role);
      })
      .catch((caught) => {
        const msg = getApiErrorMessage(caught);
        if (err) {
          err.textContent = msg;
          err.hidden = false;
        }
      });
  });
  $("#btn-logout").addEventListener("click", () => logout());

  const openProf = $("#open-profile");
  if (openProf) openProf.addEventListener("click", () => openProfileModal());
  const profClose = $("#profile-close");
  if (profClose) profClose.addEventListener("click", () => closeProfileModal());
  const profBd = $("#profile-backdrop");
  if (profBd) profBd.addEventListener("click", () => closeProfileModal());
  const profChAdd = $("#prof-child-add");
  if (profChAdd) profChAdd.addEventListener("click", () => submitProfileAddChild());
  const profClAdd = $("#prof-class-add");
  if (profClAdd) profClAdd.addEventListener("click", () => submitProfileAddClass());

  fetch("/api/auth/me", fetchCred)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const role = data && data.user && data.user.role;
      if (role === "parent" || role === "teacher") {
        showMainApp();
        bootstrapAfterLogin(role);
      } else {
        showLanding();
      }
    })
    .catch(() => showLanding());
})();
