(function () {
  "use strict";

  /** @type {{ id: string, name: string, classLabel: string }[]} */
  let children = [];
  /** @type {string} */
  let childId = "";
  /** @type {string} ISO date */
  let diaryDate = "2026-03-27";
  /** @type {string[]} */
  let diaryDates = [];
  let pCalViewYear = 2026;
  /** month 0..11 */
  let pCalViewMonth = 2;

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
  /** @type {'parent' | 'teacher' | 'director'} */
  let appRole = "parent";
  /** @type {'classes' | 'parents' | 'teachers' | 'schedule'} */
  let dTab = "classes";

  function parentHasChild() {
    return Boolean(String(childId || "").trim());
  }

  /** После изменений в профиле родителя — перезагрузить детей и текущую вкладку (без запросов с пустым childId). */
  function syncParentShellAfterChildrenChange() {
    if (appRole !== "parent") return Promise.resolve();
    return loadChildren()
      .then(() => {
        if (!parentHasChild()) {
          diaryDates = [];
          updateDiaryNavState();
          const lessonsEl = $("#diary-lessons");
          if (lessonsEl) {
            lessonsEl.removeAttribute("aria-busy");
            lessonsEl.innerHTML =
              '<p class="placeholder-msg" style="text-align:center;color:#888;font-size:0.88rem">Нет ученика для дневника. Привяжите ребёнка в профиле или обратитесь к директору.</p>';
          }
          return;
        }
        if (tab === "diary") {
          return loadDiaryMeta().then(() => loadDiary());
        }
        runTabDataLoads();
        return undefined;
      })
      .catch((err) => {
        announceStatus(getApiErrorMessage(err));
      });
  }
  /** @type {string} */
  let tClassId = "c8a";
  /** @type {string} ISO */
  let tDiaryDate = "2026-04-03";
  /** @type {string[]} */
  let tDiaryDates = [];
  let tCalViewYear = 2026;
  /** month index 0..11 for teacher date-picker */
  let tCalViewMonth = 2;
  /** @type {{ name: string, subject: string, subjects?: string[] } | null} */
  let teacherProfile = null;
  /** @type {{ id: string, label: string, grade: number }[]} */
  let teacherClasses = [];
  /** @type {Record<string, unknown> | null} */
  let editingLesson = null;

  /** @type {ReturnType<typeof setTimeout> | 0} */
  let statusToastTimer = 0;

  /** Предмет, для которого в демо есть таблица оценок за день (сервер также проверяет). */
  const PRIMARY_GRADES_SUBJECT = "Математика";
  /** @type {'diary' | 'pupil' | 'tmeet' | 'quarters'} */
  let tTab = "diary";
  /** @type {string | null} */
  let editingStudentKey = null;
  /** @type {string | null} */
  let tSelectedPupilKey = null;

  const $ = (sel, root = document) => root.querySelector(sel);

  function teacherActiveSubject() {
    return (teacherProfile && teacherProfile.subject) || PRIMARY_GRADES_SUBJECT;
  }

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

  function apiPatch(path, body) {
    return fetch(path, {
      ...fetchCred,
      method: "PATCH",
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

  function apiDelete(path, body) {
    const payload = body == null ? undefined : JSON.stringify(body);
    return fetch(path, {
      ...fetchCred,
      method: "DELETE",
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      body: payload,
    }).then((r) =>
      readResponseBody(r).then((parsed) => handleFetched(r, parsed))
    );
  }

  function getApiErrorMessage(err) {
    if (err == null) return "Неизвестная ошибка";
    if (typeof err === "string") {
      if (/failed to fetch|networkerror|load failed/i.test(err)) return "Нет соединения с сервером";
      return err;
    }
    const rawMsg = typeof err.message === "string" ? err.message : "";
    if (/failed to fetch|networkerror|load failed|network request failed/i.test(rawMsg))
      return "Нет соединения с сервером";
    if (typeof err.message === "string" && err.message) return err.message;
    if (err.name === "TypeError" && /fetch|network|Network/i.test(String(err.message)))
      return "Нет соединения с сервером";
    return "Ошибка запроса";
  }

  function announceStatus(text) {
    const el = $("#app-announcer");
    if (el) {
      el.textContent = "";
      if (text) {
        requestAnimationFrame(() => {
          el.textContent = text;
        });
      }
    }
    const toast = $("#app-status-toast");
    if (!toast) return;
    if (statusToastTimer) {
      clearTimeout(statusToastTimer);
      statusToastTimer = 0;
    }
    const t = text != null ? String(text).trim() : "";
    if (!t) {
      toast.hidden = true;
      toast.textContent = "";
      return;
    }
    toast.textContent = t;
    toast.hidden = false;
    statusToastTimer = setTimeout(() => {
      toast.hidden = true;
      toast.textContent = "";
      statusToastTimer = 0;
    }, 4500);
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
          (teacherProfile && teacherProfile.subject) || PRIMARY_GRADES_SUBJECT;
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
    if (appRole === "director") return;
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
    return api("/api/children")
      .then((data) => {
        children = data.children || [];
        const cur = children.find((c) => c.id === childId) || children[0];
        if (cur) {
          childId = cur.id;
          $("#hdr-name").textContent = cur.name;
          $("#hdr-class").textContent = cur.classLabel;
        } else {
          childId = "";
          const hn = $("#hdr-name");
          const hc = $("#hdr-class");
          if (hn) hn.textContent = "Нет привязанных детей";
          if (hc) hc.textContent = "Добавьте ребёнка в профиле или через директора";
        }
      })
      .catch((err) => {
        children = [];
        childId = "";
        const hn = $("#hdr-name");
        const hc = $("#hdr-class");
        if (hn) hn.textContent = "Нет привязанных детей";
        if (hc) hc.textContent = "Не удалось загрузить список детей";
        announceStatus(getApiErrorMessage(err));
      });
  }

  function loadDiaryMeta() {
    if (!parentHasChild()) {
      diaryDates = [];
      updateDiaryNavState();
      return Promise.resolve();
    }
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
    const onlyActiveSubject = opts && opts.onlyActiveSubject;
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
    const showChildGrade = !teacherEdit;
    top.innerHTML =
      '<div><div class="lesson__title"></div><div class="lesson__time"></div></div>' +
      (showChildGrade
        ? lesson.grade != null
          ? '<div class="lesson__grade"></div>'
          : '<div class="lesson__grade" style="opacity:0">—</div>'
        : "");
    top.querySelector(".lesson__title").textContent = lesson.title;
    top.querySelector(".lesson__time").textContent = lesson.timeLabel;
    if (showChildGrade && lesson.grade != null) {
      const gEl = top.querySelector(".lesson__grade");
      if (gEl) gEl.textContent = String(lesson.grade);
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
    if (teacherEdit && (!onlyActiveSubject || lesson.title === teacherActiveSubject())) {
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
      if (loginHints) {
        loginHints.hidden = false;
        loginHints.innerHTML =
          "<strong>Демо-аккаунты (для проверки):</strong><br />" +
          "Директор — <code>director.demo@school.local</code>, пароль <code>DirectorDemo2026</code><br />" +
          "Учитель (Соколова Виктория Павловна, Литература) — <code>teacher.rus@school.local</code>, пароль <code>TeacherDemo2026</code><br />" +
          "Учитель (Лебедева Алёна Михайловна, История) — <code>teacher.math@school.local</code>, пароль <code>TeacherDemo2026</code><br />" +
          "Учитель (Мельникова Снежана Оскаровна, Химия) — <code>teacher.pool.45@school.local</code>, пароль <code>TeacherDemo2026</code><br />" +
          "Родитель (семья Кагосима) — <code>kagosima.parent@school.local</code>, пароль <code>FamilyParent2026</code><br />" +
          "Родитель (семья Мацумото) — <code>matsumoto.parent@school.local</code>, пароль <code>FamilyParent2026</code><br />" +
          "Родитель (семья Танака) — <code>tanaka.parent@school.local</code>, пароль <code>FamilyParent2026</code>";
      }
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
    if (appRole === "parent") {
      void syncParentShellAfterChildrenChange();
    }
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

    const phoneEl = $("#prof-phone");
    const phoneIncomplete = $("#prof-phone-incomplete");
    if (data.role === "parent") {
      if (phoneEl) phoneEl.value = String(data.phone || "").trim();
      if (phoneIncomplete) {
        phoneIncomplete.hidden = Boolean(String(data.phone || "").trim());
      }
    } else {
      if (phoneEl) phoneEl.value = "";
      if (phoneIncomplete) phoneIncomplete.hidden = true;
    }

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
        if (c.linkedStudentId == null || c.linkedStudentId === "") {
          const warn = document.createElement("span");
          warn.className = "profile-list__sub";
          warn.style.color = "#b45309";
          warn.style.display = "block";
          warn.style.fontSize = "0.78rem";
          warn.textContent =
            "Нет привязки к ученику в школе (дневник недоступен). Обратитесь к директору.";
          li.appendChild(warn);
        }
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
          if (data.role === "parent") {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                const ph = $("#prof-phone");
                if (ph && m.contains(ph)) {
                  try {
                    ph.focus();
                  } catch (_) {}
                }
              });
            });
          }
        }
      })
      .catch((err) => {
        announceStatus(getApiErrorMessage(err));
      });
  }

  function submitProfileRedeemLinkKey() {
    setProfileError("");
    const keyEl = $("#prof-link-key");
    const linkKey = keyEl ? String(keyEl.value || "").trim().toUpperCase() : "";
    if (!linkKey) {
      setProfileError("Введите ключ привязки.");
      return;
    }
    apiPost("/api/parent/link-keys/redeem", { linkKey })
      .then((body) => {
        if (keyEl) keyEl.value = "";
        announceStatus(body && body.linkedNow ? "Ребенок привязан по ключу" : "Ребенок уже был привязан к аккаунту");
        return api("/api/profile").then((data) => {
          renderProfileData(data);
          void syncParentShellAfterChildrenChange();
        });
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
    teacherProfile = null;
    const landing = $("#shell-landing");
    const app = $("#shell-app");
    if (landing) {
      landing.hidden = false;
      playLandingMotion(landing);
    }
    if (app) app.hidden = true;
    document.body.classList.add("auth-landing");
    /* shell-director и director-bottomnav вне #shell-app — без сброса роли остаются на экране после выхода */
    applyRole("parent");
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
    appRole = role === "teacher" || role === "director" ? role : "parent";

    const shellP = $("#shell-parent");
    const shellT = $("#shell-teacher");
    const shellD = $("#shell-director");
    const nav = document.querySelector(".bottomnav:not(.bottomnav--teacher)");
    const tnav = $("#teacher-bottomnav");
    const dnav = $("#director-bottomnav");
    const op = $("#open-picker");

    document.body.classList.remove("mode-teacher");
    document.body.classList.remove("mode-director");

    if (appRole === "teacher") {
      const tw = $("#teacher-subject-wrap");
      if (tw) tw.hidden = true;
      document.body.classList.add("mode-teacher");
      shellP.classList.add("view--hidden");
      shellT.classList.remove("view--hidden");
      shellT.removeAttribute("hidden");
      if (shellD) {
        shellD.classList.add("view--hidden");
        shellD.setAttribute("hidden", "");
      }
      if (nav) nav.hidden = true;
      if (tnav) tnav.hidden = false;
      if (dnav) dnav.hidden = true;
      if (op) op.hidden = false;
      document.body.style.paddingBottom = "calc(72px + env(safe-area-inset-bottom, 0))";
    } else if (appRole === "director") {
      teacherProfile = null;
      const twd = $("#teacher-subject-wrap");
      if (twd) twd.hidden = true;
      document.body.classList.add("mode-director");
      shellP.classList.add("view--hidden");
      shellT.classList.add("view--hidden");
      shellT.setAttribute("hidden", "");
      if (shellD) {
        shellD.classList.remove("view--hidden");
        shellD.removeAttribute("hidden");
      }
      if (nav) nav.hidden = true;
      if (tnav) tnav.hidden = true;
      if (dnav) dnav.hidden = false;
      if (op) op.hidden = true;
      document.body.style.paddingBottom = "calc(72px + env(safe-area-inset-bottom, 0))";
      $("#hdr-name").textContent = "Кабинет директора";
      $("#hdr-class").textContent = "Администрирование";
    } else {
      teacherProfile = null;
      const twp = $("#teacher-subject-wrap");
      if (twp) twp.hidden = true;
      document.body.classList.remove("mode-teacher");
      document.body.classList.remove("mode-director");
      shellP.classList.remove("view--hidden");
      shellT.classList.add("view--hidden");
      shellT.setAttribute("hidden", "");
      if (shellD) {
        shellD.classList.add("view--hidden");
        shellD.setAttribute("hidden", "");
      }
      if (nav) nav.hidden = false;
      if (tnav) tnav.hidden = true;
      if (dnav) dnav.hidden = true;
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
    applyRole(role === "teacher" || role === "director" ? role : "parent");
    if (role === "teacher") {
      initTeacherShell();
    } else if (role === "director") {
      initDirectorShell();
    } else {
      loadChildren().then(() => {
        setTab("diary");
        if (!parentHasChild()) return;
        return loadDiaryMeta().then(() => loadDiary());
      });
    }
  }

  function initDirectorShell() {
    const dayMap = ["Пн", "Вт", "Ср", "Чт", "Пт"];
    let selectedClassId = "";
    let selectedClassNum = "";
    let selectedClassParallel = "";
    let selectedClassStudents = [];
    let allClasses = [];
    let parentsOffset = 0;
    let parentsLimit = 15;
    let parentsTotal = 0;
    let parentsHasMore = true;
    let parentsLoading = false;
    let parentsRequestToken = 0;
    let parentSearchDebounceTimer = 0;
    let dSortDir = "asc";
    let parentsSortDir = "asc";
    let classStudentsSortDir = "asc";
    let classStudentsSearchDebounce = 0;
    let scheduleClassSearchDebounce = 0;
    let auditPollTimer = 0;
    let teachersOffset = 0;
    let teachersLimit = 15;
    let teachersTotal = 0;
    let teachersHasMore = true;
    let teachersLoading = false;
    let teachersRequestToken = 0;
    let teachersSortDir = "asc";
    let teachersSearchDebounceTimer = 0;
    const SCHEDULE_FIXED_QUARTER = 4;
    const dViews = {
      classes: "#d-view-classes",
      parents: "#d-view-parents",
      teachers: "#d-view-teachers",
      schedule: "#d-view-schedule",
    };
    const classMeta = (c) => {
      const label = String(c.label || c.id || "").trim();
      const m = label.match(/^(\d+)\s*([A-Za-zА-Яа-яЁё]+)$/);
      const classNum = m ? Number(m[1]) : Number(c.grade || 0);
      const parallel = m ? m[2].toUpperCase() : label.replace(/\d+/g, "").trim().toUpperCase() || "";
      return { classNum, parallel, label };
    };
    const normalizeClassKey = (s) => String(s || "").trim().toUpperCase().replace(/\s+/g, "");
    const normalizeQuick = (s) => String(s || "").toLowerCase().replace(/\s+/g, "");
    const parseBulkStudentsInput = (text) => {
      const lines = String(text || "").split(/\r?\n/);
      const valid = [];
      const errors = [];
      lines.forEach((raw, idx) => {
        const cleaned = String(raw || "").trim().replace(/\s+/g, " ");
        if (!cleaned) return;
        const parts = cleaned.split(" ").filter(Boolean);
        if (parts.length < 3) {
          errors.push({ line: idx + 1, reason: "Нужно минимум 3 слова", raw: cleaned });
          return;
        }
        const [lastName, firstName, ...rest] = parts;
        valid.push({
          line: idx + 1,
          lastName,
          firstName,
          patronymic: rest.join(" "),
          fullName: cleaned,
        });
      });
      return { valid, errors };
    };
    const renderBulkPreview = (parsed) => {
      const wrap = $("#d-bulk-students-preview");
      if (!wrap) return;
      const lines = [];
      lines.push(`<div class="ok">Валидных строк: ${parsed.valid.length}</div>`);
      if (parsed.errors.length) {
        lines.push(`<div class="err">Ошибок: ${parsed.errors.length}</div>`);
        parsed.errors.slice(0, 20).forEach((e) => {
          lines.push(`<div class="err">Строка ${e.line}: ${e.reason} (${e.raw})</div>`);
        });
      } else {
        lines.push(`<div class="ok">Ошибок не найдено</div>`);
      }
      wrap.innerHTML = lines.join("");
    };
    const syncParentsSortDirBtn = () => {
      const btn = $("#d-parent-sort-dir");
      if (!btn) return;
      const isAsc = parentsSortDir === "asc";
      btn.textContent = isAsc ? "↑" : "↓";
      btn.setAttribute("aria-label", isAsc ? "По возрастанию" : "По убыванию");
      btn.title = isAsc ? "По возрастанию" : "По убыванию";
    };
    const syncTeachersSortDirBtn = () => {
      const btn = $("#d-teachers-sort-dir");
      if (!btn) return;
      const isAsc = teachersSortDir === "asc";
      btn.textContent = isAsc ? "↑" : "↓";
      btn.setAttribute("aria-label", isAsc ? "По возрастанию" : "По убыванию");
      btn.title = isAsc ? "По возрастанию" : "По убыванию";
    };
    const syncClassStudentsSortDirBtn = () => {
      const btn = $("#d-class-students-sort-dir");
      if (!btn) return;
      const isAsc = classStudentsSortDir === "asc";
      btn.textContent = isAsc ? "↑" : "↓";
      btn.setAttribute("aria-label", isAsc ? "По возрастанию по фамилии" : "По убыванию по фамилии");
      btn.title = isAsc ? "По возрастанию" : "По убыванию";
    };
    const studentSurname = (s) => {
      const n = String(s && s.name ? s.name : "").trim();
      const p = n.split(/\s+/).filter(Boolean);
      return p[0] || "";
    };
    const getClassStudentsDisplayList = () => {
      let list = Array.isArray(selectedClassStudents) ? selectedClassStudents.slice() : [];
      const q = normalizeQuick($("#d-class-students-search")?.value || "");
      if (q) {
        list = list.filter((s) => {
          const full = normalizeQuick(s.name || "");
          const sur = normalizeQuick(studentSurname(s));
          const keyQ = normalizeQuick(s.parentLinkCode || "");
          return full.includes(q) || sur.includes(q) || keyQ.includes(q);
        });
      }
      const dir = classStudentsSortDir === "desc" ? -1 : 1;
      list.sort((a, b) => dir * studentSurname(a).localeCompare(studentSurname(b), "ru"));
      return list;
    };
    const renderSelectedClassStudents = () => {
      const stTb = $("#d-class-students-tbody");
      if (!stTb || !selectedClassId) return;
      const list = getClassStudentsDisplayList();
      stTb.innerHTML = "";
      list.forEach((s, i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = "<td></td><td></td><td></td>";
        tr.children[0].textContent = String(i + 1);
        tr.children[1].textContent = s.name || "—";
        tr.children[2].textContent = s.parentLinkCode || "—";
        stTb.appendChild(tr);
      });
    };
    const loadStudentsForClass = (classId, classNum, parallel) => {
      const stTitle = $("#d-class-students-title");
      const toolbar = $("#d-class-students-toolbar");
      const searchEl = $("#d-class-students-search");
      if (searchEl) searchEl.value = "";
      classStudentsSortDir = "asc";
      syncClassStudentsSortDirBtn();
      return api(`/api/director/classes/${encodeURIComponent(classId)}/students`)
        .then((ds) => {
          const students = (ds && ds.students) || [];
          selectedClassStudents = students;
          if (toolbar) toolbar.removeAttribute("hidden");
          if (stTitle) stTitle.textContent = `Ученики класса ${classNum}${parallel}`;
          renderSelectedClassStudents();
          const studentsWrap = $("#d-class-students-scroll");
          if (studentsWrap && typeof studentsWrap.scrollIntoView === "function") {
            studentsWrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        })
        .catch((e) => {
          if (toolbar) toolbar.setAttribute("hidden", "");
          announceStatus(getApiErrorMessage(e));
        });
    };
    const renderClassRows = () => {
      const tb = $("#d-classes-tbody");
      if (!tb) return;
      const search = normalizeQuick($("#d-class-search")?.value || "");
      const gradeFilter = String($("#d-class-grade-filter")?.value || "").trim();
      const sortBy = String($("#d-class-sort-by")?.value || "grade");
      const rows = allClasses
        .map((c) => ({ ...c, ...classMeta(c) }))
        .filter((c) => {
          if (gradeFilter && String(c.classNum) !== gradeFilter) return false;
          if (!search) return true;
          return normalizeQuick(`${c.classNum}${c.parallel}`).includes(search);
        })
        .sort((a, b) => {
          const dir = dSortDir === "desc" ? -1 : 1;
          if (sortBy === "students") return dir * ((Number(a.studentsCount) || 0) - (Number(b.studentsCount) || 0));
          if (sortBy === "parallel") {
            if (a.parallel !== b.parallel) return dir * a.parallel.localeCompare(b.parallel, "ru");
            return dir * (a.classNum - b.classNum);
          }
          if (a.classNum !== b.classNum) return dir * (a.classNum - b.classNum);
          return dir * a.parallel.localeCompare(b.parallel, "ru");
        });
      tb.innerHTML = "";
      rows.forEach((c) => {
        const tr = document.createElement("tr");
        const c1 = tr.insertCell();
        const c2 = tr.insertCell();
        const c3 = tr.insertCell();
        const c4 = tr.insertCell();
        c1.textContent = String(c.classNum || "—");
        c2.textContent = c.parallel || "—";
        c3.textContent = c.studentsCount != null ? String(c.studentsCount) : "0";
        c4.textContent = c.classTeacherFullName || "—";
        if (selectedClassId && selectedClassId === (c.id || c.label || "")) tr.classList.add("is-active");
        tr.addEventListener("click", () => {
          tb.querySelectorAll("tr").forEach((row) => row.classList.remove("is-active"));
          tr.classList.add("is-active");
          selectedClassId = c.id || c.label || "";
          selectedClassNum = String(c.classNum || "");
          selectedClassParallel = c.parallel || "";
          loadStudentsForClass(selectedClassId, selectedClassNum, selectedClassParallel);
        });
        tb.appendChild(tr);
      });
    };
    const syncScheduleClassSelect = (opts = {}) => {
      const sel = $("#d-schedule-class");
      if (!sel) return;
      const preserve = opts.preserve === true;
      const prev = preserve ? String(sel.value || "") : "";
      const search = normalizeQuick($("#d-schedule-class-search")?.value || "");
      const gradeFilter = String($("#d-schedule-grade-filter")?.value || "").trim();
      const list = allClasses
        .map((c) => ({ ...c, ...classMeta(c) }))
        .filter((c) => {
          if (gradeFilter && String(c.classNum) !== gradeFilter) return false;
          if (!search) return true;
          return normalizeQuick(`${c.classNum}${c.parallel} ${c.label || ""} ${c.id || ""}`).includes(search);
        })
        .sort((a, b) => {
          if (a.classNum !== b.classNum) return a.classNum - b.classNum;
          return a.parallel.localeCompare(b.parallel, "ru");
        });
      sel.innerHTML = "";
      list.forEach((c) => {
        const o = document.createElement("option");
        o.value = c.id;
        o.textContent = c.label || `${c.classNum}${c.parallel}`;
        sel.appendChild(o);
      });
      if (prev) {
        const canRestore = [...sel.options].some((o) => o.value === prev);
        if (canRestore) sel.value = prev;
      }
      if (!sel.value && sel.options.length) sel.value = sel.options[0].value;
    };
    const classIdFromModal = (gradeSelId, parallelSelId) => {
      const grade = String($(gradeSelId)?.value || "").trim();
      const parallel = String($(parallelSelId)?.value || "").trim().toUpperCase();
      if (!grade || !parallel) return "";
      return `${grade}${parallel}`;
    };
    const refreshDeleteTargetClasses = () => {
      const sel = $("#d-delete-target-class");
      if (!sel) return;
      sel.innerHTML = "";
      const g = Number($("#d-delete-grade")?.value || "");
      const currentDeleteId = classIdFromModal("#d-delete-grade", "#d-delete-parallel");
      if (!Number.isFinite(g) || g < 1) {
        const o = document.createElement("option");
        o.value = "";
        o.textContent = "Сначала укажите параллель удаляемого класса";
        sel.appendChild(o);
        return;
      }
      const list = allClasses
        .filter(
          (c) =>
            Number(c.grade) === g && normalizeClassKey(c.id) !== normalizeClassKey(currentDeleteId)
        )
        .map((c) => ({ ...c, ...classMeta(c) }))
        .sort((a, b) => {
          if (a.classNum !== b.classNum) return a.classNum - b.classNum;
          return a.parallel.localeCompare(b.parallel, "ru");
        });
      if (!list.length) {
        const ph = document.createElement("option");
        ph.value = "";
        ph.textContent = "Нет другого класса в этой параллели";
        sel.appendChild(ph);
        return;
      }
      list.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.label || `${c.classNum}${c.parallel}`;
        sel.appendChild(opt);
      });
      sel.value = sel.options[0] ? sel.options[0].value : "";
    };
    const loadAuditLog = () =>
      api("/api/director/audit-log?limit=20")
        .then((d) => {
          const rows = (d && d.items) || [];
          const tb = $("#d-audit-tbody");
          if (!tb) return;
          tb.innerHTML = "";
          rows.forEach((it) => {
            const tr = document.createElement("tr");
            tr.innerHTML = "<td></td><td></td><td></td><td></td>";
            tr.children[0].textContent = new Date(it.createdAt).toLocaleString("ru-RU");
            tr.children[1].textContent = it.action || "—";
            tr.children[2].textContent = it.actorName || "Система";
            tr.children[3].textContent =
              it.payloadJson && typeof it.payloadJson === "object"
                ? JSON.stringify(it.payloadJson)
                : "—";
            tb.appendChild(tr);
          });
        })
        .catch((e) => announceStatus(getApiErrorMessage(e)));
    const loadClasses = () =>
      api("/api/director/classes")
        .then((d) => {
          allClasses = (d && d.classes) || [];
          renderClassRows();
          refreshDeleteTargetClasses();
          syncScheduleClassSelect({ preserve: true });
          return allClasses;
        })
        .catch((e) => {
          announceStatus(getApiErrorMessage(e));
          return [];
        });
    const reloadClassesAndStudents = () =>
      loadClasses().then(() => {
        if (selectedClassId) {
          return loadStudentsForClass(selectedClassId, selectedClassNum, selectedClassParallel);
        }
        return Promise.resolve();
      });
    const openModal = (id) => {
      const m = $(id);
      if (m) {
        m.hidden = false;
        beginModalMotion(m);
      }
    };
    const closeModal = (id) => {
      const m = $(id);
      if (m) {
        endModalMotion(m);
        m.hidden = true;
      }
    };
    const normalizeParentChildren = (arr) =>
      (Array.isArray(arr) ? arr : [])
        .map((c) => {
          if (typeof c === "string") return { fullName: c.trim() };
          if (c && typeof c === "object") {
            return {
              fullName: String(c.fullName || "").trim(),
            };
          }
          return { fullName: "" };
        })
        .filter((c) => c.fullName.length > 0);
    const updateParentsMeta = (message) => {
      const meta = $("#d-parents-meta");
      if (meta) meta.textContent = message;
    };
    const updateParentsTopButton = () => {
      const scrollWrap = $("#d-parents-scroll");
      const topBtn = $("#d-parents-scroll-top");
      if (!scrollWrap || !topBtn) return;
      topBtn.hidden = scrollWrap.scrollTop < 220;
    };
    const syncParentsLoadMoreBtn = () => {
      const wrap = $("#d-parents-scroll");
      const btn = $("#d-parents-load-more");
      if (!wrap || !btn) return;
      const overflows = wrap.scrollHeight > wrap.clientHeight + 2;
      btn.hidden = !(parentsHasMore && !overflows);
    };
    const PARENT_CHILDREN_INLINE = 2;
    const fillParentProfileModal = (profile) => {
      const modal = $("#d-parent-profile-modal");
      const fio = $("#d-parent-profile-fio");
      const email = $("#d-parent-profile-email");
      const phone = $("#d-parent-profile-phone");
      const avatar = $("#d-parent-profile-avatar");
      const kids = $("#d-parent-profile-children");
      const parentId = profile && (profile.userId != null ? profile.userId : profile.id);
      if (modal && profile && parentId != null) {
        modal.dataset.parentId = String(parentId);
        modal.dataset.email = profile.email || "";
        modal.dataset.phone = String(profile.phone || "").trim();
      } else if (modal) {
        delete modal.dataset.parentId;
        delete modal.dataset.email;
        delete modal.dataset.phone;
      }
      const fioParts =
        profile &&
        [profile.lastName, profile.firstName, profile.patronymic]
          .map((x) => String(x || "").trim())
          .filter(Boolean);
      const fullName =
        fioParts && fioParts.length
          ? fioParts.join(" ")
          : profile && profile.fullName
          ? profile.fullName
          : "";
      if (fio) fio.textContent = profile ? fullName || "—" : "—";
      if (email) email.textContent = profile ? `Почта: ${profile.email || "—"}` : "Почта: —";
      if (phone) {
        const ph = profile ? String(profile.phone || "").trim() : "";
        phone.textContent = ph ? `Телефон: ${ph}` : "Телефон: —";
      }
      if (avatar) {
        const url =
          profile && profile.avatarUrl && String(profile.avatarUrl).trim()
            ? String(profile.avatarUrl).trim()
            : "";
        avatar.src =
          url ||
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72'%3E%3Crect width='100%25' height='100%25' fill='%23eef4ff'/%3E%3Ctext x='50%25' y='54%25' text-anchor='middle' font-size='12' fill='%23496a9f'%3Eavatar%3C/text%3E%3C/svg%3E";
      }
      if (kids) {
        kids.innerHTML = "";
        const arr = profile && Array.isArray(profile.children) ? profile.children : [];
        arr.forEach((k) => {
          const row = document.createElement("tr");
          row.innerHTML = "<td></td><td></td>";
          let childName = k.fullName;
          if (childName == null || childName === "") {
            childName = [k.lastName, k.firstName, k.patronymic]
              .map((x) => String(x || "").trim())
              .filter(Boolean)
              .join(" ");
          }
          row.children[0].textContent = childName || "—";
          const cellClass = row.children[1];
          cellClass.textContent = "";
          const cls = document.createElement("span");
          cls.textContent = k.classLabel || "—";
          cellClass.appendChild(cls);
          if (k.linkedStudentId == null || k.linkedStudentId === "") {
            const warn = document.createElement("div");
            warn.className = "profile-list__sub";
            warn.style.color = "#b45309";
            warn.style.fontSize = "0.78rem";
            warn.style.marginTop = "4px";
            warn.textContent =
              "Нет привязки к ученику в школе (дневник недоступен). Обратитесь к директору.";
            cellClass.appendChild(warn);
          }
          kids.appendChild(row);
        });
      }
    };
    const renderParentRow = (p) => {
      const tb = $("#d-parents-tbody");
      if (!tb) return;
      const tr = document.createElement("tr");
      tr.className = "d-parent-row";
      tr.innerHTML = "<td></td><td></td><td></td>";
      tr.children[0].textContent = p.fullName || "—";
      tr.children[1].textContent = p.email || "";
      const childrenCell = tr.children[2];
      childrenCell.textContent = "";
      const children = normalizeParentChildren(p.children);
      const renderChildrenIntoCell = () => {
        childrenCell.textContent = "";
        if (!children.length) {
          childrenCell.textContent = "—";
          return;
        }
        const showExpand = children.length > PARENT_CHILDREN_INLINE;
        const list = showExpand && !tr.classList.contains("d-parent-row--expanded") ? children.slice(0, PARENT_CHILDREN_INLINE) : children;
        list.forEach((c, idx) => {
          const nameNode = document.createElement("span");
          nameNode.textContent = `${c.fullName} `;
          childrenCell.appendChild(nameNode);
          if (idx < list.length - 1) childrenCell.appendChild(document.createElement("br"));
        });
        if (showExpand) {
          const wrap = document.createElement("span");
          wrap.className = "d-parent-more-wrap";
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "d-parent-more";
          btn.textContent = tr.classList.contains("d-parent-row--expanded")
            ? "Свернуть"
            : `+${children.length - PARENT_CHILDREN_INLINE} ещё`;
          btn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            tr.classList.toggle("d-parent-row--expanded");
            renderChildrenIntoCell();
          });
          wrap.appendChild(document.createElement("br"));
          wrap.appendChild(btn);
          childrenCell.appendChild(wrap);
        }
      };
      renderChildrenIntoCell();
      tr.addEventListener("click", (ev) => {
        if (ev.target.closest && ev.target.closest(".d-parent-more")) return;
        const pid = p.id;
        fillParentProfileModal(null);
        const fioEl = $("#d-parent-profile-fio");
        if (fioEl) fioEl.textContent = "Загрузка…";
        openModal("#d-parent-profile-modal");
        api(`/api/director/parents/${encodeURIComponent(String(pid))}/profile`)
          .then((resp) => {
            const profile = resp && resp.profile;
            if (!profile) {
              fillParentProfileModal(null);
              if (fioEl) fioEl.textContent = "Не удалось загрузить профиль";
              announceStatus("Нет данных профиля");
              return;
            }
            fillParentProfileModal(profile);
          })
          .catch((e) => {
            fillParentProfileModal(null);
            const fe = $("#d-parent-profile-fio");
            if (fe) fe.textContent = "Ошибка загрузки";
            announceStatus(getApiErrorMessage(e));
          });
      });
      tb.appendChild(tr);
    };
    const loadParents = (opts = {}) => {
      const reset = opts.reset === true;
      if (reset) {
        // Invalidate in-flight response when user changes filters/search quickly.
        parentsRequestToken += 1;
      } else if (parentsLoading) {
        return Promise.resolve();
      }
      if (reset) {
        parentsOffset = 0;
        parentsHasMore = true;
        parentsTotal = 0;
        const tb = $("#d-parents-tbody");
        if (tb) tb.innerHTML = "";
      }
      if (!parentsHasMore && !reset) return Promise.resolve();
      parentsLoading = true;
      const token = ++parentsRequestToken;
      updateParentsMeta("Загрузка...");
      const search = String($("#d-parent-search")?.value || "").trim();
      const rawSortBy = String($("#d-parent-sort-by")?.value || "name");
      const sortBy = rawSortBy === "children" ? "children" : "name";
      const qs = new URLSearchParams({
        limit: String(parentsLimit),
        offset: String(parentsOffset),
        search,
        sortBy,
        sortDir: parentsSortDir,
      });
      return api(`/api/director/parents?${qs.toString()}`)
        .then((d) => {
          if (token !== parentsRequestToken) return;
          const apiParents = Array.isArray(d && d.parents) ? d.parents : [];
          const page = d && d.page ? d.page : null;
          let rows = apiParents;
          if (page) {
            const t = Number(page.total);
            parentsTotal = Number.isFinite(t) ? t : 0;
            parentsHasMore = Boolean(page.hasMore);
            const nextOff = page.nextOffset;
            parentsOffset =
              nextOff != null && Number.isFinite(Number(nextOff)) ? Number(nextOff) : parentsOffset + rows.length;
            if (parentsTotal === 0 && rows.length > 0) {
              parentsTotal = Math.max(parentsOffset, rows.length);
            }
          } else {
            // Backward compatibility: server returned the full list without pagination meta.
            let pool = apiParents;
            const q = normalizeQuick(search);
            if (q) {
              pool = pool.filter((p) => {
                const kids = normalizeParentChildren(p.children)
                  .map((c) => c.fullName)
                  .join(" ");
                return normalizeQuick(`${p.fullName || ""} ${p.email || ""} ${kids}`).includes(q);
              });
            }
            const start = parentsOffset;
            const end = parentsOffset + parentsLimit;
            rows = pool.slice(start, end);
            parentsTotal = pool.length;
            parentsOffset = Math.min(end, parentsTotal);
            parentsHasMore = parentsOffset < parentsTotal;
          }
          rows.forEach((p) => renderParentRow(p));
          const tb = $("#d-parents-tbody");
          if (tb && tb.children.length === 0) {
            updateParentsMeta("Ничего не найдено");
          } else if (!parentsHasMore) {
            updateParentsMeta(`Все записи загружены: ${Math.min(parentsOffset, parentsTotal)} из ${parentsTotal}`);
          } else {
            updateParentsMeta(`Показано ${Math.min(parentsOffset, parentsTotal)} из ${parentsTotal}`);
          }
          updateParentsTopButton();
          requestAnimationFrame(() => syncParentsLoadMoreBtn());
        })
        .catch((e) => announceStatus(getApiErrorMessage(e)))
        .finally(() => {
          if (token === parentsRequestToken) parentsLoading = false;
        });
    };
    const updateTeachersMeta = (message) => {
      const el = $("#d-teachers-meta");
      if (el) el.textContent = message;
    };
    const updateTeachersTopButton = () => {
      const scrollWrap = $("#d-teachers-scroll");
      const topBtn = $("#d-teachers-scroll-top");
      if (!scrollWrap || !topBtn) return;
      topBtn.hidden = scrollWrap.scrollTop < 220;
    };
    const syncTeachersLoadMoreBtn = () => {
      const wrap = $("#d-teachers-scroll");
      const btn = $("#d-teachers-load-more");
      if (!wrap || !btn) return;
      const overflows = wrap.scrollHeight > wrap.clientHeight + 2;
      btn.hidden = !(teachersHasMore && !overflows);
    };
    const renderTeacherRow = (t) => {
      const tb = $("#d-teachers-tbody");
      if (!tb) return;
      const tr = document.createElement("tr");
      tr.innerHTML = "<td></td><td></td><td></td>";
      tr.children[0].textContent = t.fullName || "—";
      tr.children[1].textContent = t.email || "";
      tr.children[2].textContent = Array.isArray(t.subjects) && t.subjects.length ? t.subjects.join(", ") : "—";
      tb.appendChild(tr);
    };
    const loadTeachers = (opts = {}) => {
      const reset = opts.reset === true;
      if (reset) {
        teachersRequestToken += 1;
      } else if (teachersLoading) {
        return Promise.resolve();
      }
      if (reset) {
        teachersOffset = 0;
        teachersHasMore = true;
        teachersTotal = 0;
        const tb = $("#d-teachers-tbody");
        if (tb) tb.innerHTML = "";
      }
      if (!teachersHasMore && !reset) return Promise.resolve();
      teachersLoading = true;
      const token = ++teachersRequestToken;
      updateTeachersMeta("Загрузка...");
      const qs = new URLSearchParams({
        limit: String(teachersLimit),
        offset: String(teachersOffset),
        search: String($("#d-teachers-search")?.value || "").trim(),
        sortBy: String($("#d-teachers-sort-by")?.value || "name"),
        sortDir: teachersSortDir,
      });
      return api(`/api/director/teachers?${qs.toString()}`)
        .then((d) => {
          if (token !== teachersRequestToken) return;
          const apiRows = Array.isArray(d && d.teachers) ? d.teachers : [];
          const page = d && d.page ? d.page : null;
          let rows = apiRows;
          if (page) {
            const t = Number(page.total);
            teachersTotal = Number.isFinite(t) ? t : 0;
            teachersHasMore = Boolean(page.hasMore);
            const nextOff = page.nextOffset;
            teachersOffset =
              nextOff != null && Number.isFinite(Number(nextOff)) ? Number(nextOff) : teachersOffset + rows.length;
            if (teachersTotal === 0 && rows.length > 0) {
              teachersTotal = Math.max(teachersOffset, rows.length);
            }
          } else {
            teachersTotal = rows.length;
            teachersOffset = rows.length;
            teachersHasMore = false;
          }
          const tb = $("#d-teachers-tbody");
          if (!rows.length && tb && tb.children.length === 0) {
            const tr = document.createElement("tr");
            tr.innerHTML = "<td colspan=\"3\">Учителя не найдены</td>";
            tb.appendChild(tr);
            updateTeachersMeta("Ничего не найдено");
          } else {
            rows.forEach((t) => renderTeacherRow(t));
            if (!teachersHasMore) {
              updateTeachersMeta(`Все записи загружены: ${Math.min(teachersOffset, teachersTotal)} из ${teachersTotal}`);
            } else {
              updateTeachersMeta(`Показано ${Math.min(teachersOffset, teachersTotal)} из ${teachersTotal}`);
            }
          }
          updateTeachersTopButton();
          requestAnimationFrame(() => syncTeachersLoadMoreBtn());
        })
        .catch((e) => announceStatus(getApiErrorMessage(e)))
        .finally(() => {
          if (token === teachersRequestToken) teachersLoading = false;
        });
    };
    const loadSchedule = () => {
      const classSel = $("#d-schedule-class");
      const classId = classSel ? String(classSel.value || "") : "";
      const quarter = SCHEDULE_FIXED_QUARTER;
      const meta = $("#d-schedule-meta");
      if (!classId) {
        if (meta) meta.textContent = "Выберите класс";
        announceStatus("Выберите класс для загрузки расписания");
        return;
      }
      if (meta) meta.textContent = "Загрузка...";
      api(`/api/director/schedule?classId=${encodeURIComponent(classId)}&quarter=${encodeURIComponent(String(quarter))}`)
        .then((d) => {
          const rows = (d && d.items) || [];
          const tb = $("#d-schedule-tbody");
          if (tb) tb.innerHTML = "";
          if (!rows.length) {
            if (tb) {
              const tr = document.createElement("tr");
              tr.innerHTML = "<td colspan=\"6\">Для выбранного класса расписание пока не задано</td>";
              tb.appendChild(tr);
            }
            if (meta) meta.textContent = "Нет данных";
            announceStatus("Для выбранного класса расписание пока не задано");
            return;
          }
          const byDayIdx = new Map();
          for (const it of rows) {
            const di = Number(it.weekday_idx);
            if (!byDayIdx.has(di)) byDayIdx.set(di, []);
            byDayIdx.get(di).push(it);
          }
          const dayOrder = [0, 1, 2, 3, 4].filter((di) => byDayIdx.has(di));
          for (const di of dayOrder) {
            const lessons = byDayIdx.get(di).slice();
            lessons.sort((a, b) => Number(a.lesson_order) - Number(b.lesson_order));
            lessons.forEach((it, idx) => {
              const tr = document.createElement("tr");
              if (idx === 0) tr.classList.add("d-schedule-day-start");
              if (idx === 0) {
                tr.innerHTML = "<td></td><td></td><td></td><td></td><td></td><td></td>";
                if (tr.children.length > 6) tr.children[6].remove();
                const dayCell = tr.children[0];
                dayCell.rowSpan = lessons.length;
                dayCell.className = "d-schedule-day-cell";
                dayCell.textContent = dayMap[di] || String(di);
                tr.children[1].textContent = String(it.lesson_order);
                tr.children[2].textContent = it.subject_name || "";
                tr.children[3].textContent = it.time_label || "";
                tr.children[4].textContent = it.teacher_name || "—";
                tr.children[5].textContent = it.cabinet_label || "—";
              } else {
                tr.innerHTML = "<td></td><td></td><td></td><td></td><td></td>";
                if (tr.children.length > 5) tr.children[0].remove();
                tr.children[0].textContent = String(it.lesson_order);
                tr.children[1].textContent = it.subject_name || "";
                tr.children[2].textContent = it.time_label || "";
                tr.children[3].textContent = it.teacher_name || "—";
                tr.children[4].textContent = it.cabinet_label || "—";
              }
              if (tb) tb.appendChild(tr);
            });
          }
          if (meta) meta.textContent = `Загружено строк: ${rows.length}`;
        })
        .catch((e) => {
          if (meta) meta.textContent = "Ошибка загрузки";
          announceStatus(getApiErrorMessage(e));
        });
    };
    const escapeCsv = (s) => {
      const t = String(s ?? "");
      if (/[",;\r\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
      return t;
    };
    const exportClassStudentsCsv = () => {
      if (!selectedClassId) {
        announceStatus("Сначала выберите класс");
        return;
      }
      const list = getClassStudentsDisplayList();
      const classLabel = `${selectedClassNum || ""}${selectedClassParallel || ""}`.trim() || selectedClassId;
      const sep = ";";
      const header = ["№", "ФИО", "Ключ", "Класс"].map(escapeCsv).join(sep);
      const lines = ["\ufeff" + header];
      list.forEach((s, i) => {
        lines.push(
          [
            String(i + 1),
            s.name || "",
            s.parentLinkCode || "",
            classLabel,
          ]
            .map(escapeCsv)
            .join(sep)
        );
      });
      const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `students_${classLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      announceStatus(`Экспорт: ${list.length} строк`);
    };
    const exportParentsCsv = () => {
      const search = String($("#d-parent-search")?.value || "").trim();
      const sortBy = String($("#d-parent-sort-by")?.value || "name");
      const limit = 200;
      let offset = 0;
      const rowsOut = [];
      const header = ["ФИО_родителя", "Email", "Телефон", "Дети"];
      const fetchPage = () => {
        const qs = new URLSearchParams({
          limit: String(limit),
          offset: String(offset),
          search,
          sortBy,
          sortDir: parentsSortDir,
        });
        return api(`/api/director/parents?${qs.toString()}`).then((d) => {
          const parents = Array.isArray(d && d.parents) ? d.parents : [];
          const page = d && d.page ? d.page : {};
          parents.forEach((p) => {
            const kids = normalizeParentChildren(p.children);
            const kidsStr = kids.map((x) => `${x.fullName}`).join("; ");
            rowsOut.push([
              p.fullName || "",
              p.email || "",
              p.phone || "",
              kidsStr,
            ]);
          });
          const hasMore = Boolean(page.hasMore);
          const nextOff = page.nextOffset;
          offset = Number.isFinite(Number(nextOff)) ? Number(nextOff) : offset + parents.length;
          if (hasMore && offset < 5000) return fetchPage();
          const sep = ";";
          const lines = [header.map(escapeCsv).join(sep)];
          rowsOut.forEach((r) => lines.push(r.map(escapeCsv).join(sep)));
          const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `parents_${new Date().toISOString().slice(0, 10)}.csv`;
          a.click();
          URL.revokeObjectURL(a.href);
          announceStatus(`Экспорт: ${rowsOut.length} строк`);
        });
      };
      announceStatus("Формируем CSV…");
      fetchPage().catch((e) => announceStatus(getApiErrorMessage(e)));
    };

    const exportTeachersCsv = () => {
      const search = String($("#d-teachers-search")?.value || "").trim();
      const sortBy = String($("#d-teachers-sort-by")?.value || "name");
      const limit = 200;
      let offset = 0;
      const rowsOut = [];
      const header = ["ФИО", "Email", "Предметы"];
      const fetchPage = () => {
        const qs = new URLSearchParams({
          limit: String(limit),
          offset: String(offset),
          search,
          sortBy,
          sortDir: teachersSortDir,
        });
        return api(`/api/director/teachers?${qs.toString()}`).then((d) => {
          const teachers = Array.isArray(d && d.teachers) ? d.teachers : [];
          const page = d && d.page ? d.page : {};
          teachers.forEach((t) => {
            rowsOut.push([
              t.fullName || "",
              t.email || "",
              Array.isArray(t.subjects) ? t.subjects.join(", ") : "",
            ]);
          });
          const hasMore = Boolean(page.hasMore);
          const nextOff = page.nextOffset;
          offset = Number.isFinite(Number(nextOff)) ? Number(nextOff) : offset + teachers.length;
          if (hasMore && offset < 20000) return fetchPage();
          const sep = ";";
          const lines = [header.map(escapeCsv).join(sep)];
          rowsOut.forEach((r) => lines.push(r.map(escapeCsv).join(sep)));
          const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `teachers_${new Date().toISOString().slice(0, 10)}.csv`;
          a.click();
          URL.revokeObjectURL(a.href);
          announceStatus(`Экспорт: ${rowsOut.length} строк`);
        });
      };
      announceStatus("Формируем CSV…");
      fetchPage().catch((e) => announceStatus(getApiErrorMessage(e)));
    };
    const setDirectorTab = (next) => {
      dTab = next;
      Object.values(dViews).forEach((sel) => {
        const el = $(sel);
        if (el) el.classList.add("view--hidden");
      });
      const sec = $(dViews[next]);
      if (sec) sec.classList.remove("view--hidden");
      document.querySelectorAll("#director-bottomnav .bn-item").forEach((b) => {
        b.classList.toggle("is-active", b.getAttribute("data-director-tab") === next);
      });
      if (next === "classes") {
        loadClasses().then(loadAuditLog);
      }
      if (auditPollTimer) {
        clearInterval(auditPollTimer);
        auditPollTimer = 0;
      }
      if (next === "classes") {
        auditPollTimer = setInterval(() => {
          if (dTab === "classes") loadAuditLog();
        }, 8000);
      }
      if (next === "parents") {
        const wrap = $("#d-parents-scroll");
        if (wrap) wrap.scrollTop = 0;
        loadParents({ reset: true });
      }
      if (next === "teachers") {
        const tw = $("#d-teachers-scroll");
        if (tw) tw.scrollTop = 0;
        loadTeachers({ reset: true });
      }
      if (next === "schedule") {
        syncScheduleClassSelect({ preserve: true });
        loadSchedule();
      }
    };

    document.querySelectorAll("#director-bottomnav .bn-item").forEach((b) => {
      if (b.dataset.bound) return;
      b.dataset.bound = "1";
      b.addEventListener("click", () => {
        const next = b.getAttribute("data-director-tab");
        if (next) setDirectorTab(next);
      });
    });
    const loadBtn = $("#d-schedule-load");
    if (loadBtn && !loadBtn.dataset.bound) {
      loadBtn.dataset.bound = "1";
      loadBtn.addEventListener("click", loadSchedule);
    }
    const scheduleClassSearch = $("#d-schedule-class-search");
    if (scheduleClassSearch && !scheduleClassSearch.dataset.bound) {
      scheduleClassSearch.dataset.bound = "1";
      scheduleClassSearch.addEventListener("input", () => {
        if (scheduleClassSearchDebounce) clearTimeout(scheduleClassSearchDebounce);
        scheduleClassSearchDebounce = setTimeout(() => syncScheduleClassSelect({ preserve: true }), 200);
      });
      scheduleClassSearch.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          if (scheduleClassSearchDebounce) clearTimeout(scheduleClassSearchDebounce);
          syncScheduleClassSelect({ preserve: true });
          loadSchedule();
        }
      });
    }
    const scheduleGradeFilter = $("#d-schedule-grade-filter");
    if (scheduleGradeFilter && !scheduleGradeFilter.dataset.bound) {
      scheduleGradeFilter.dataset.bound = "1";
      scheduleGradeFilter.addEventListener("change", () => syncScheduleClassSelect({ preserve: true }));
    }
    const scheduleClassSel = $("#d-schedule-class");
    if (scheduleClassSel && !scheduleClassSel.dataset.bound) {
      scheduleClassSel.dataset.bound = "1";
      scheduleClassSel.addEventListener("change", () => loadSchedule());
    }
    const parentSearch = $("#d-parent-search");
    const parentSortBy = $("#d-parent-sort-by");
    const parentsScroll = $("#d-parents-scroll");
    const parentsTopBtn = $("#d-parents-scroll-top");
    const parentsLoadMoreBtn = $("#d-parents-load-more");
    const teachersSearch = $("#d-teachers-search");
    const teachersSortBy = $("#d-teachers-sort-by");
    const teachersSortDirBtn = $("#d-teachers-sort-dir");
    if (teachersSearch && !teachersSearch.dataset.bound) {
      teachersSearch.dataset.bound = "1";
      teachersSearch.addEventListener("input", () => {
        if (teachersSearchDebounceTimer) clearTimeout(teachersSearchDebounceTimer);
        teachersSearchDebounceTimer = setTimeout(() => loadTeachers({ reset: true }), 300);
      });
      teachersSearch.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          if (teachersSearchDebounceTimer) clearTimeout(teachersSearchDebounceTimer);
          loadTeachers({ reset: true });
        }
      });
    }
    if (teachersSortBy && !teachersSortBy.dataset.bound) {
      teachersSortBy.dataset.bound = "1";
      teachersSortBy.addEventListener("change", () => loadTeachers({ reset: true }));
    }
    if (teachersSortDirBtn && !teachersSortDirBtn.dataset.bound) {
      teachersSortDirBtn.dataset.bound = "1";
      syncTeachersSortDirBtn();
      teachersSortDirBtn.addEventListener("click", () => {
        teachersSortDir = teachersSortDir === "asc" ? "desc" : "asc";
        syncTeachersSortDirBtn();
        loadTeachers({ reset: true });
      });
    }
    if (parentSearch && !parentSearch.dataset.bound) {
      parentSearch.dataset.bound = "1";
      parentSearch.addEventListener("input", () => {
        if (parentSearchDebounceTimer) clearTimeout(parentSearchDebounceTimer);
        parentSearchDebounceTimer = setTimeout(() => {
          loadParents({ reset: true });
        }, 300);
      });
      parentSearch.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          if (parentSearchDebounceTimer) clearTimeout(parentSearchDebounceTimer);
          loadParents({ reset: true });
        }
      });
    }
    if (parentSortBy && !parentSortBy.dataset.bound) {
      parentSortBy.dataset.bound = "1";
      parentSortBy.addEventListener("change", () => loadParents({ reset: true }));
    }
    const parentSortDirBtn = $("#d-parent-sort-dir");
    if (parentSortDirBtn && !parentSortDirBtn.dataset.bound) {
      parentSortDirBtn.dataset.bound = "1";
      syncParentsSortDirBtn();
      parentSortDirBtn.addEventListener("click", () => {
        parentsSortDir = parentsSortDir === "asc" ? "desc" : "asc";
        syncParentsSortDirBtn();
        loadParents({ reset: true });
      });
    }
    if (parentsScroll && !parentsScroll.dataset.bound) {
      parentsScroll.dataset.bound = "1";
      parentsScroll.addEventListener("scroll", () => {
        updateParentsTopButton();
        if (parentsLoading || !parentsHasMore) return;
        const overflows = parentsScroll.scrollHeight > parentsScroll.clientHeight + 2;
        if (!overflows) return;
        const remain = parentsScroll.scrollHeight - parentsScroll.scrollTop - parentsScroll.clientHeight;
        if (remain < 120) loadParents();
      });
    }
    if (parentsLoadMoreBtn && !parentsLoadMoreBtn.dataset.bound) {
      parentsLoadMoreBtn.dataset.bound = "1";
      parentsLoadMoreBtn.addEventListener("click", () => loadParents());
    }
    if (parentsTopBtn && !parentsTopBtn.dataset.bound) {
      parentsTopBtn.dataset.bound = "1";
      parentsTopBtn.addEventListener("click", () => {
        const wrap = $("#d-parents-scroll");
        if (!wrap) return;
        wrap.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
    const closeParentProfile = $("#d-parent-profile-close");
    if (closeParentProfile && !closeParentProfile.dataset.bound) {
      closeParentProfile.dataset.bound = "1";
      closeParentProfile.addEventListener("click", () => closeModal("#d-parent-profile-modal"));
    }
    const bdParentProfile = $("#d-parent-profile-backdrop");
    if (bdParentProfile && !bdParentProfile.dataset.bound) {
      bdParentProfile.dataset.bound = "1";
      bdParentProfile.addEventListener("click", () => closeModal("#d-parent-profile-modal"));
    }

    const copyDirectorClipboard = (text) => {
      const s = String(text || "").trim();
      if (!s) {
        announceStatus("Нечего копировать");
        return;
      }
      const ok = () => announceStatus("Скопировано");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(s).then(ok).catch(() => announceStatus("Не удалось скопировать"));
        return;
      }
      try {
        const ta = document.createElement("textarea");
        ta.value = s;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        ok();
      } catch {
        announceStatus("Не удалось скопировать");
      }
    };
    const copyEmailBtn = $("#d-parent-profile-copy-email");
    if (copyEmailBtn && !copyEmailBtn.dataset.bound) {
      copyEmailBtn.dataset.bound = "1";
      copyEmailBtn.addEventListener("click", () => {
        const m = $("#d-parent-profile-modal");
        copyDirectorClipboard(m && m.dataset.email);
      });
    }
    const copyPhoneBtn = $("#d-parent-profile-copy-phone");
    if (copyPhoneBtn && !copyPhoneBtn.dataset.bound) {
      copyPhoneBtn.dataset.bound = "1";
      copyPhoneBtn.addEventListener("click", () => {
        const m = $("#d-parent-profile-modal");
        copyDirectorClipboard(m && m.dataset.phone);
      });
    }
    const exportParentsBtn = $("#d-parents-export-csv");
    if (exportParentsBtn && !exportParentsBtn.dataset.bound) {
      exportParentsBtn.dataset.bound = "1";
      exportParentsBtn.addEventListener("click", () => exportParentsCsv());
    }
    const exportTeachersBtn = $("#d-teachers-export-csv");
    if (exportTeachersBtn && !exportTeachersBtn.dataset.bound) {
      exportTeachersBtn.dataset.bound = "1";
      exportTeachersBtn.addEventListener("click", () => exportTeachersCsv());
    }

    const clearCreateClassError = () => {
      const errEl = $("#d-create-class-error");
      if (errEl) {
        errEl.hidden = true;
        errEl.textContent = "";
      }
    };
    const showCreateClassError = (msg) => {
      const m = String(msg || "").trim();
      if (!m) return;
      announceStatus(m);
      const errEl = $("#d-create-class-error");
      if (errEl) {
        errEl.textContent = m;
        errEl.hidden = false;
      }
    };
    const openCreate = $("#d-open-create-class");
    if (openCreate && !openCreate.dataset.bound) {
      openCreate.dataset.bound = "1";
      openCreate.addEventListener("click", () => {
        clearCreateClassError();
        openModal("#d-create-class-modal");
      });
    }
    const closeCreate = $("#d-create-class-cancel");
    if (closeCreate && !closeCreate.dataset.bound) {
      closeCreate.dataset.bound = "1";
      closeCreate.addEventListener("click", () => {
        clearCreateClassError();
        closeModal("#d-create-class-modal");
      });
    }
    const bdCreate = $("#d-create-class-backdrop");
    if (bdCreate && !bdCreate.dataset.bound) {
      bdCreate.dataset.bound = "1";
      bdCreate.addEventListener("click", () => {
        clearCreateClassError();
        closeModal("#d-create-class-modal");
      });
    }
    const saveCreate = $("#d-create-class-save");
    if (saveCreate && !saveCreate.dataset.bound) {
      saveCreate.dataset.bound = "1";
      saveCreate.addEventListener("click", () => {
        clearCreateClassError();
        const classId = classIdFromModal("#d-create-grade", "#d-create-parallel");
        const grade = Number($("#d-create-grade")?.value || "");
        if (!classId || !Number.isFinite(grade)) {
          showCreateClassError("Выберите класс и параллель");
          return;
        }
        const wantKey = normalizeClassKey(classId);
        const already = allClasses.some((c) => {
          const idK = normalizeClassKey(c.id);
          const labelK = normalizeClassKey(c.label);
          return idK === wantKey || labelK === wantKey;
        });
        if (already) {
          showCreateClassError("Класс с таким названием уже существует");
          return;
        }
        apiPost("/api/director/classes", { classId, grade })
          .then(() => {
            clearCreateClassError();
            closeModal("#d-create-class-modal");
            reloadClassesAndStudents().then(loadAuditLog);
          })
          .catch((e) => showCreateClassError(getApiErrorMessage(e)));
      });
    }

    let syncDeleteModeUi = () => {};
    const deleteModeSelEarly = $("#d-delete-mode");
    const deleteTargetWrapEarly = $("#d-delete-target-wrap");
    if (deleteModeSelEarly && !deleteModeSelEarly.dataset.boundEarly) {
      deleteModeSelEarly.dataset.boundEarly = "1";
      syncDeleteModeUi = () => {
        if (!deleteTargetWrapEarly) return;
        const isMove = String(deleteModeSelEarly.value) === "move";
        deleteTargetWrapEarly.hidden = !isMove;
        if (isMove) refreshDeleteTargetClasses();
      };
      deleteModeSelEarly.addEventListener("change", syncDeleteModeUi);
      syncDeleteModeUi();
    }
    const deleteGradeSel = $("#d-delete-grade");
    const deleteParallelSel = $("#d-delete-parallel");
    if (deleteGradeSel && !deleteGradeSel.dataset.boundDelRefresh) {
      deleteGradeSel.dataset.boundDelRefresh = "1";
      deleteGradeSel.addEventListener("change", () => {
        if (String($("#d-delete-mode")?.value || "") === "move") refreshDeleteTargetClasses();
      });
    }
    if (deleteParallelSel && !deleteParallelSel.dataset.boundDelRefresh) {
      deleteParallelSel.dataset.boundDelRefresh = "1";
      deleteParallelSel.addEventListener("change", () => {
        if (String($("#d-delete-mode")?.value || "") === "move") refreshDeleteTargetClasses();
      });
    }
    const openDelete = $("#d-open-delete-class");
    if (openDelete && !openDelete.dataset.bound) {
      openDelete.dataset.bound = "1";
      openDelete.addEventListener("click", () => {
        syncDeleteModeUi();
        refreshDeleteTargetClasses();
        openModal("#d-delete-class-modal");
      });
    }
    const closeDelete = $("#d-delete-class-cancel");
    if (closeDelete && !closeDelete.dataset.bound) {
      closeDelete.dataset.bound = "1";
      closeDelete.addEventListener("click", () => closeModal("#d-delete-class-modal"));
    }
    const bdDelete = $("#d-delete-class-backdrop");
    if (bdDelete && !bdDelete.dataset.bound) {
      bdDelete.dataset.bound = "1";
      bdDelete.addEventListener("click", () => closeModal("#d-delete-class-modal"));
    }
    const saveDelete = $("#d-delete-class-save");
    if (saveDelete && !saveDelete.dataset.bound) {
      saveDelete.dataset.bound = "1";
      saveDelete.addEventListener("click", () => {
        const classId = classIdFromModal("#d-delete-grade", "#d-delete-parallel");
        const mode = String($("#d-delete-mode")?.value || "move");
        const targetClassId = String($("#d-delete-target-class")?.value || "").trim();
        if (!classId) {
          announceStatus("Выберите класс и параллель");
          return;
        }
        if (mode === "move") {
          const g = Number($("#d-delete-grade")?.value || "");
          const candidates = allClasses.filter(
            (c) =>
              Number(c.grade) === g &&
              normalizeClassKey(c.id) !== normalizeClassKey(classId)
          );
          if (!candidates.length) {
            announceStatus("Нет другого класса в этой параллели для переноса");
            return;
          }
          if (!targetClassId) {
            announceStatus("Выберите целевой класс для переноса");
            return;
          }
        }
        apiDelete(`/api/director/classes/${encodeURIComponent(classId)}`, { mode, targetClassId })
          .then(() => {
            closeModal("#d-delete-class-modal");
            if (selectedClassId === classId) {
              selectedClassId = "";
              selectedClassStudents = [];
              const stTb = $("#d-class-students-tbody");
              const stTitle = $("#d-class-students-title");
              if (stTb) stTb.innerHTML = "";
              if (stTitle) stTitle.textContent = "Ученики класса —";
            }
            reloadClassesAndStudents().then(loadAuditLog);
          })
          .catch((e) => announceStatus(getApiErrorMessage(e)));
      });
    }
    const fillRemoveStudentsSelect = () => {
      const sel = $("#d-remove-student-select");
      if (!sel) return;
      sel.innerHTML = "";
      selectedClassStudents.forEach((s) => {
        const o = document.createElement("option");
        o.value = s.id;
        o.textContent = s.name;
        sel.appendChild(o);
      });
    };
    const openAddStudent = $("#d-open-add-student");
    if (openAddStudent && !openAddStudent.dataset.bound) {
      openAddStudent.dataset.bound = "1";
      openAddStudent.addEventListener("click", () => {
        if (!selectedClassId) {
          announceStatus("Сначала выберите класс в таблице");
          return;
        }
        const ln = $("#d-add-student-last-name");
        const fn = $("#d-add-student-first-name");
        const pn = $("#d-add-student-patronymic");
        if (ln) ln.value = "";
        if (fn) fn.value = "";
        if (pn) pn.value = "";
        openModal("#d-add-student-modal");
      });
    }
    const closeAddStudent = $("#d-add-student-cancel");
    if (closeAddStudent && !closeAddStudent.dataset.bound) {
      closeAddStudent.dataset.bound = "1";
      closeAddStudent.addEventListener("click", () => closeModal("#d-add-student-modal"));
    }
    const bdAddStudent = $("#d-add-student-backdrop");
    if (bdAddStudent && !bdAddStudent.dataset.bound) {
      bdAddStudent.dataset.bound = "1";
      bdAddStudent.addEventListener("click", () => closeModal("#d-add-student-modal"));
    }
    const saveAddStudent = $("#d-add-student-save");
    if (saveAddStudent && !saveAddStudent.dataset.bound) {
      saveAddStudent.dataset.bound = "1";
      saveAddStudent.addEventListener("click", () => {
        const lastName = String($("#d-add-student-last-name")?.value || "").trim();
        const firstName = String($("#d-add-student-first-name")?.value || "").trim();
        const patronymic = String($("#d-add-student-patronymic")?.value || "").trim();
        if (!selectedClassId || !lastName || !firstName || !patronymic) {
          announceStatus("Выберите класс и ученика");
          return;
        }
        const fullNameNorm = `${lastName} ${firstName} ${patronymic}`.trim().replace(/\s+/g, " ");
        const nameKey = fullNameNorm.toLowerCase();
        if (
          selectedClassStudents.some(
            (s) =>
              String(s.name || "")
                .trim()
                .replace(/\s+/g, " ")
                .toLowerCase() === nameKey
          )
        ) {
          announceStatus("Ученик с таким ФИО уже есть в этом классе");
          return;
        }
        apiPost(`/api/director/classes/${encodeURIComponent(selectedClassId)}/students`, {
          fullName: fullNameNorm,
        })
          .then(() => {
            closeModal("#d-add-student-modal");
            loadClasses().then(() =>
              loadStudentsForClass(selectedClassId, selectedClassNum, selectedClassParallel)
            ).then(loadAuditLog);
          })
          .catch((e) => announceStatus(getApiErrorMessage(e)));
      });
    }
    const openRemoveStudent = $("#d-open-remove-student");
    if (openRemoveStudent && !openRemoveStudent.dataset.bound) {
      openRemoveStudent.dataset.bound = "1";
      openRemoveStudent.addEventListener("click", () => {
        if (!selectedClassId) {
          announceStatus("Сначала выберите класс в таблице");
          return;
        }
        fillRemoveStudentsSelect();
        openModal("#d-remove-student-modal");
      });
    }
    const closeRemoveStudent = $("#d-remove-student-cancel");
    if (closeRemoveStudent && !closeRemoveStudent.dataset.bound) {
      closeRemoveStudent.dataset.bound = "1";
      closeRemoveStudent.addEventListener("click", () => closeModal("#d-remove-student-modal"));
    }
    const bdRemoveStudent = $("#d-remove-student-backdrop");
    if (bdRemoveStudent && !bdRemoveStudent.dataset.bound) {
      bdRemoveStudent.dataset.bound = "1";
      bdRemoveStudent.addEventListener("click", () => closeModal("#d-remove-student-modal"));
    }
    const saveRemoveStudent = $("#d-remove-student-save");
    if (saveRemoveStudent && !saveRemoveStudent.dataset.bound) {
      saveRemoveStudent.dataset.bound = "1";
      saveRemoveStudent.addEventListener("click", () => {
        const studentId = String($("#d-remove-student-select")?.value || "").trim();
        if (!studentId || !selectedClassId) {
          announceStatus("Выберите ученика");
          return;
        }
        apiDelete(
          `/api/director/classes/${encodeURIComponent(selectedClassId)}/students/${encodeURIComponent(studentId)}`
        )
          .then(() => {
            closeModal("#d-remove-student-modal");
            loadClasses().then(() =>
              loadStudentsForClass(selectedClassId, selectedClassNum, selectedClassParallel)
            ).then(loadAuditLog);
          })
          .catch((e) => announceStatus(getApiErrorMessage(e)));
      });
    }
    const openBulkAdd = $("#d-open-bulk-add-students");
    if (openBulkAdd && !openBulkAdd.dataset.bound) {
      openBulkAdd.dataset.bound = "1";
      openBulkAdd.addEventListener("click", () => {
        if (!selectedClassId) {
          announceStatus("Сначала выберите класс в таблице");
          return;
        }
        const input = $("#d-bulk-students-input");
        const preview = $("#d-bulk-students-preview");
        if (input) input.value = "";
        if (preview) preview.innerHTML = "";
        openModal("#d-bulk-add-students-modal");
      });
    }
    const closeBulkAdd = $("#d-bulk-students-cancel");
    if (closeBulkAdd && !closeBulkAdd.dataset.bound) {
      closeBulkAdd.dataset.bound = "1";
      closeBulkAdd.addEventListener("click", () => closeModal("#d-bulk-add-students-modal"));
    }
    const bdBulkAdd = $("#d-bulk-add-students-backdrop");
    if (bdBulkAdd && !bdBulkAdd.dataset.bound) {
      bdBulkAdd.dataset.bound = "1";
      bdBulkAdd.addEventListener("click", () => closeModal("#d-bulk-add-students-modal"));
    }
    const validateBulk = $("#d-bulk-students-validate");
    if (validateBulk && !validateBulk.dataset.bound) {
      validateBulk.dataset.bound = "1";
      validateBulk.addEventListener("click", () => {
        const parsed = parseBulkStudentsInput($("#d-bulk-students-input")?.value || "");
        renderBulkPreview(parsed);
      });
    }
    const saveBulk = $("#d-bulk-students-save");
    if (saveBulk && !saveBulk.dataset.bound) {
      saveBulk.dataset.bound = "1";
      saveBulk.addEventListener("click", () => {
        if (!selectedClassId) {
          announceStatus("Сначала выберите класс");
          return;
        }
        const parsed = parseBulkStudentsInput($("#d-bulk-students-input")?.value || "");
        renderBulkPreview(parsed);
        if (!parsed.valid.length) {
          announceStatus("Нет валидных строк для добавления");
          return;
        }
        apiPost(`/api/director/classes/${encodeURIComponent(selectedClassId)}/students/bulk`, {
          students: parsed.valid.map((s) => ({
            line: s.line,
            lastName: s.lastName,
            firstName: s.firstName,
            patronymic: s.patronymic,
          })),
        })
          .then((result) => {
            closeModal("#d-bulk-add-students-modal");
            announceStatus(
              `Добавлено: ${Number(result.addedCount) || 0}, пропущено: ${(result.skipped || []).length}, ошибок: ${(result.errors || []).length}`
            );
            reloadClassesAndStudents().then(loadAuditLog);
          })
          .catch((e) => announceStatus(getApiErrorMessage(e)));
      });
    }
    const classSearch = $("#d-class-search");
    const classGradeFilter = $("#d-class-grade-filter");
    const classSortBy = $("#d-class-sort-by");
    const classSortDir = $("#d-class-sort-dir");
    if (classSearch && !classSearch.dataset.bound) {
      classSearch.dataset.bound = "1";
      classSearch.addEventListener("input", renderClassRows);
    }
    if (classGradeFilter && !classGradeFilter.dataset.bound) {
      classGradeFilter.dataset.bound = "1";
      classGradeFilter.addEventListener("change", renderClassRows);
    }
    if (classSortBy && !classSortBy.dataset.bound) {
      classSortBy.dataset.bound = "1";
      classSortBy.addEventListener("change", renderClassRows);
    }
    if (classSortDir && !classSortDir.dataset.bound) {
      classSortDir.dataset.bound = "1";
      classSortDir.addEventListener("click", () => {
        dSortDir = dSortDir === "asc" ? "desc" : "asc";
        const isAsc = dSortDir === "asc";
        classSortDir.textContent = isAsc ? "↑" : "↓";
        classSortDir.setAttribute("aria-label", isAsc ? "По возрастанию" : "По убыванию");
        classSortDir.title = isAsc ? "По возрастанию" : "По убыванию";
        renderClassRows();
      });
    }
    const classStudentsSearch = $("#d-class-students-search");
    if (classStudentsSearch && !classStudentsSearch.dataset.bound) {
      classStudentsSearch.dataset.bound = "1";
      classStudentsSearch.addEventListener("input", () => {
        if (classStudentsSearchDebounce) clearTimeout(classStudentsSearchDebounce);
        classStudentsSearchDebounce = setTimeout(() => renderSelectedClassStudents(), 200);
      });
    }
    const classStudentsSortDirBtn = $("#d-class-students-sort-dir");
    if (classStudentsSortDirBtn && !classStudentsSortDirBtn.dataset.bound) {
      classStudentsSortDirBtn.dataset.bound = "1";
      syncClassStudentsSortDirBtn();
      classStudentsSortDirBtn.addEventListener("click", () => {
        classStudentsSortDir = classStudentsSortDir === "asc" ? "desc" : "asc";
        syncClassStudentsSortDirBtn();
        renderSelectedClassStudents();
      });
    }
    const classStudentsExport = $("#d-class-students-export-csv");
    if (classStudentsExport && !classStudentsExport.dataset.bound) {
      classStudentsExport.dataset.bound = "1";
      classStudentsExport.addEventListener("click", () => exportClassStudentsCsv());
    }
    const teachersScroll = $("#d-teachers-scroll");
    const teachersLoadMoreBtn = $("#d-teachers-load-more");
    const teachersTopBtn = $("#d-teachers-scroll-top");
    if (teachersScroll && !teachersScroll.dataset.bound) {
      teachersScroll.dataset.bound = "1";
      teachersScroll.addEventListener("scroll", () => {
        updateTeachersTopButton();
        if (teachersLoading || !teachersHasMore) return;
        // Не догружаем, пока пользователь не сместился вниз.
        // Иначе при небольшом количестве строк на первом экране список быстро догружается до конца.
        if ((teachersScroll.scrollTop || 0) <= 0) return;
        const overflows = teachersScroll.scrollHeight > teachersScroll.clientHeight + 2;
        if (!overflows) return;
        const remain = teachersScroll.scrollHeight - teachersScroll.scrollTop - teachersScroll.clientHeight;
        if (remain < 120) loadTeachers();
      });
    }
    if (teachersLoadMoreBtn && !teachersLoadMoreBtn.dataset.bound) {
      teachersLoadMoreBtn.dataset.bound = "1";
      teachersLoadMoreBtn.addEventListener("click", () => loadTeachers());
    }
    if (teachersTopBtn && !teachersTopBtn.dataset.bound) {
      teachersTopBtn.dataset.bound = "1";
      teachersTopBtn.addEventListener("click", () => {
        const wrap = $("#d-teachers-scroll");
        if (wrap) wrap.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
    loadClasses().then(() => setDirectorTab(dTab));
  }

  function updateTeacherHeader() {
    const c = teacherClasses.find((x) => x.id === tClassId);
    if (c) {
      $("#hdr-name").textContent = `Класс ${c.label}`;
      $("#hdr-class").textContent =
        (teacherProfile && teacherProfile.subject) || PRIMARY_GRADES_SUBJECT;
    }
  }

  function syncTeacherSubjectUi() {
    const wrap = $("#teacher-subject-wrap");
    const sel = $("#teacher-subject-select");
    const hint = $("#teacher-head-hint");
    if (!teacherProfile || appRole !== "teacher") {
      if (wrap) wrap.hidden = true;
      return;
    }
    const subjects =
      Array.isArray(teacherProfile.subjects) && teacherProfile.subjects.length
        ? teacherProfile.subjects
        : [teacherProfile.subject];
    teacherProfile.subjects = subjects;
    const curRaw = String(teacherProfile.subject || "").trim();
    if (!subjects.includes(curRaw)) {
      teacherProfile.subject = subjects.includes("Математика")
        ? "Математика"
        : subjects[0];
    }
    if (wrap && sel) {
      wrap.hidden = subjects.length <= 1;
      if (!wrap.hidden) {
        const cur = teacherProfile.subject;
        sel.innerHTML = "";
        subjects.forEach((s) => {
          const o = document.createElement("option");
          o.value = s;
          o.textContent = s;
          sel.appendChild(o);
        });
        sel.value = subjects.includes(cur) ? cur : subjects[0];
        if (sel.value !== teacherProfile.subject) {
          teacherProfile.subject = sel.value;
        }
        if (!sel.dataset.bound) {
          sel.dataset.bound = "1";
          sel.addEventListener("change", () => {
            const v = sel.value;
            if (!v || v === teacherProfile.subject) return;
            apiPatch("/api/teacher/active-subject", { subjectName: v })
              .then((r) => {
                teacherProfile.subject = r.subject || v;
                if (Array.isArray(r.subjects)) teacherProfile.subjects = r.subjects;
                const line = $("#teacher-profile");
                if (line) {
                  line.textContent = `${teacherProfile.name} — ${teacherProfile.subject}`;
                }
                updateTeacherHeader();
                syncTeacherSubjectUi();
                loadTeacherDiary();
              })
              .catch((err) => {
                const msg = getApiErrorMessage(err);
                announceStatus(msg);
                sel.value = teacherProfile.subject;
              });
          });
        }
      }
    }
    const profLine = $("#teacher-profile");
    if (profLine) {
      profLine.textContent = `${teacherProfile.name} — ${teacherProfile.subject}`;
    }
    if (appRole === "teacher") {
      updateTeacherHeader();
    }
    if (hint) {
      hint.textContent = `Класс выбирается в шапке. На вкладке «Журнал» — уроки предмета «${teacherProfile.subject}» (при нескольких предметах — переключатель в шапке рядом с «Профиль»). Редактирование урока — кнопка «Изменить». Таблица ниже — оценки и посещаемость за урок выбранного предмета.`;
    }
    const cht = $("#chem-table-title");
    const tbl = $("#t-chem-table");
    const activeSubj = teacherProfile.subject || PRIMARY_GRADES_SUBJECT;
    if (cht) cht.textContent = `${activeSubj}: оценки и посещаемость за день`;
    if (tbl) tbl.setAttribute("aria-label", "Ученики и оценки за урок выбранного предмета");
    const block = $("#chem-table-block");
    if (block) block.hidden = false;
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

  function renderParentCalendar() {
    const title = $("#p-cal-title");
    const grid = $("#p-cal-grid");
    if (!title || !grid) return;
    const y = pCalViewYear;
    const m0 = pCalViewMonth;
    const mid = new Date(y, m0, 15, 12, 0, 0);
    title.textContent = mid.toLocaleDateString("ru-RU", {
      month: "long",
      year: "numeric",
    });
    grid.innerHTML = "";
    const hasSchoolSet = diaryDates.length > 0;
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
      const inSchool = !hasSchoolSet || diaryDates.indexOf(iso) >= 0;
      const isSel = iso === diaryDate;

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
        btn.className = "t-cal-cell t-cal-cell--day" + (isSel ? " is-selected" : "");
        btn.textContent = String(d);
        btn.addEventListener("click", () => {
          diaryDate = iso;
          closeParentCalendar();
          setTab("diary");
          loadDiary();
        });
        grid.appendChild(btn);
      }
    }
  }

  function openParentCalendar() {
    if (!parentHasChild() || !diaryDates.length) {
      announceStatus("Нет учебных дней в дневнике для выбора даты.");
      return;
    }
    const p = parseIsoParts(diaryDate);
    if (p.y && p.m) {
      pCalViewYear = p.y;
      pCalViewMonth = p.m - 1;
    } else {
      pCalViewYear = 2026;
      pCalViewMonth = 2;
    }
    renderParentCalendar();
    const modal = $("#p-cal-modal");
    if (modal) {
      modal.hidden = false;
      beginModalMotion(modal);
      installFocusTrap(modal, closeParentCalendar);
    }
  }

  function closeParentCalendar() {
    removeFocusTrap();
    const modal = $("#p-cal-modal");
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
    const block = $("#chem-table-block");
    if (block) block.hidden = false;
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
    if (!parentHasChild()) {
      const tbody = $("#meetings-tbody");
      const empty = $("#meetings-empty");
      const msg = $("#meetings-msg");
      if (tbody) tbody.innerHTML = "";
      if (msg) {
        msg.hidden = false;
        msg.textContent = "Сначала выберите ребёнка в шапке.";
      }
      if (empty) empty.hidden = false;
      return Promise.resolve();
    }
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
        day.lessons.forEach((les) => {
          lessonsEl.appendChild(renderLesson(les, { teacherEdit: true }));
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
        syncTeacherSubjectUi();
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
    if (!parentHasChild()) {
      if (lessonsEl) {
        lessonsEl.removeAttribute("aria-busy");
        lessonsEl.innerHTML =
          '<p class="placeholder-msg" style="text-align:center;color:#888;font-size:0.88rem">Выберите ребёнка в шапке или привяжите ученика в профиле.</p>';
      }
      return Promise.resolve();
    }
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
    if (!parentHasChild()) {
      $("#perf-date-line").textContent = "—";
      const perfQuarterEl = $("#perf-quarter") || $("#perf-trimester");
      if (perfQuarterEl) perfQuarterEl.textContent = "";
      const box = $("#perf-rows");
      if (box) box.innerHTML = "";
      return;
    }
    api(`/api/children/${encodeURIComponent(childId)}/performance`).then((p) => {
      $("#perf-date-line").textContent = p.dateLabel;
      const perfQuarterEl = $("#perf-quarter") || $("#perf-trimester");
      if (perfQuarterEl) perfQuarterEl.textContent = p.quarterLabel || "—";
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
        const perfQuarterEl = $("#perf-quarter") || $("#perf-trimester");
        if (perfQuarterEl) perfQuarterEl.textContent = "";
        const box = $("#perf-rows");
        if (box) {
          box.innerHTML = '<p class="placeholder-msg"></p>';
          const p = box.querySelector(".placeholder-msg");
          if (p) p.textContent = msg;
        }
      });
  }

  function loadGradesList() {
    if (!parentHasChild()) return;
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
    if (!parentHasChild()) {
      const box = $("#finals-rows");
      if (box) box.innerHTML = "";
      return;
    }
    const child = encodeURIComponent(childId);
    api(`/api/children/${child}/finals`)
      .then((f) => {
        $("#finals-year").textContent = f.yearLabel;
        const box = $("#finals-rows");
        box.innerHTML = "";

        const fmtInt = (n) => {
          if (n == null || Number.isNaN(Number(n))) return "—";
          return String(Math.round(Number(n)));
        };
        const fmtDec = (n) => {
          if (n == null || Number.isNaN(Number(n))) return "—";
          return Number(n).toFixed(2);
        };
        /** Годовая: строго среднее четырёх четвертей, 2 знака. */
        const yearFromQuarters = (a, b, c, d) => {
          const xs = [a, b, c, d];
          if (xs.some((v) => v == null || !Number.isFinite(Number(v)))) return null;
          const s = xs.reduce((acc, v) => acc + Number(v), 0);
          return Number((s / 4).toFixed(2));
        };

        (f.rows || []).forEach((r) => {
          const row = document.createElement("div");
          row.className = "frow";
          const name = document.createElement("div");
          name.className = "frow__name";
          name.textContent = r.subject;
          row.appendChild(name);
          const vals = document.createElement("div");
          vals.className = "frow__vals";

          const q1 = r.t1 == null ? null : Number(r.t1);
          const q2 = r.t2 == null ? null : Number(r.t2);
          const q3 = r.t3 == null ? null : Number(r.t3);
          const q4 = r.t4 == null ? null : Number(r.t4);
          const yearAvg = yearFromQuarters(q1, q2, q3, q4);

          [fmtInt(q1), fmtInt(q2), fmtInt(q3), fmtDec(q4), yearAvg == null ? "—" : fmtDec(yearAvg)].forEach(
            (text) => {
              const c = document.createElement("div");
              c.className = "frow__g";
              c.textContent = text;
              vals.appendChild(c);
            }
          );
          row.appendChild(vals);
          box.appendChild(row);
        });
      })
      .catch((err) => {
        const msg = getApiErrorMessage(err);
        announceStatus(msg);
        const box = $("#finals-rows");
        if (box) {
          box.innerHTML = '<p class="placeholder-msg"></p>';
          const p = box.querySelector(".placeholder-msg");
          if (p) p.textContent = msg;
        }
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

  document.querySelectorAll(".p-cal-open").forEach((btn) => {
    btn.addEventListener("click", openParentCalendar);
  });
  const pCalBd = $("#p-cal-backdrop");
  if (pCalBd) pCalBd.addEventListener("click", closeParentCalendar);
  const pCalClose = $("#p-cal-close");
  if (pCalClose) pCalClose.addEventListener("click", closeParentCalendar);
  const pCalPrev = $("#p-cal-prev");
  if (pCalPrev) {
    pCalPrev.addEventListener("click", () => {
      pCalViewMonth -= 1;
      if (pCalViewMonth < 0) {
        pCalViewMonth = 11;
        pCalViewYear -= 1;
      }
      renderParentCalendar();
    });
  }
  const pCalNext = $("#p-cal-next");
  if (pCalNext) {
    pCalNext.addEventListener("click", () => {
      pCalViewMonth += 1;
      if (pCalViewMonth > 11) {
        pCalViewMonth = 0;
        pCalViewYear += 1;
      }
      renderParentCalendar();
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
            role:
              roleSel && (roleSel.value === "teacher" || roleSel.value === "director")
                ? roleSel.value
                : "parent",
            lastName: ($("#auth-last-name") && $("#auth-last-name").value) || "",
            firstName: ($("#auth-first-name") && $("#auth-first-name").value) || "",
            patronymic: ($("#auth-patronymic") && $("#auth-patronymic").value) || "",
          }
        : { email, password };

    apiPost(path, payload)
      .then((body) => {
        const role = body && body.user && body.user.role;
        if (role !== "parent" && role !== "teacher" && role !== "director") {
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
  const profRedeem = $("#prof-link-key-redeem");
  if (profRedeem) profRedeem.addEventListener("click", () => submitProfileRedeemLinkKey());

  const profPhoneSave = $("#prof-phone-save");
  if (profPhoneSave) {
    profPhoneSave.addEventListener("click", () => {
      setProfileError("");
      const inp = $("#prof-phone");
      const v = inp ? String(inp.value || "") : "";
      profPhoneSave.disabled = true;
      apiPatch("/api/profile/phone", { phone: v })
        .then((data) => {
          renderProfileData(data);
          announceStatus("Телефон сохранён");
        })
        .catch((err) => setProfileError(getApiErrorMessage(err)))
        .finally(() => {
          profPhoneSave.disabled = false;
        });
    });
  }
  function copyToClipboardAnnounce(text, emptyMsg) {
    const t = String(text || "").trim();
    if (!t) {
      announceStatus(emptyMsg || "Нечего копировать");
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(
        () => announceStatus("Скопировано"),
        () => announceStatus("Не удалось скопировать")
      );
    } else {
      announceStatus("Копирование недоступно в этом браузере");
    }
  }
  const profCopyEmail = $("#prof-copy-email");
  if (profCopyEmail) {
    profCopyEmail.addEventListener("click", () => {
      const em = $("#profile-email-line");
      copyToClipboardAnnounce(em ? em.textContent : "", "Нет адреса почты");
    });
  }
  const profCopyPhone = $("#prof-copy-phone");
  if (profCopyPhone) {
    profCopyPhone.addEventListener("click", () => {
      const inp = $("#prof-phone");
      copyToClipboardAnnounce(inp ? inp.value : "", "Нет номера телефона");
    });
  }

  fetch("/api/auth/me", fetchCred)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const role = data && data.user && data.user.role;
      if (role === "parent" || role === "teacher" || role === "director") {
        showMainApp();
        bootstrapAfterLogin(role);
      } else {
        showLanding();
      }
    })
    .catch(() => showLanding());
})();
