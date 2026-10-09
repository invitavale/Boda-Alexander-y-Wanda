/* =========================================================
   Invitación Alexander & Wanda — lógica
   ========================================================= */
(function () {
  "use strict";

  // ================= CONFIGURACIÓN =================
  // Fecha y hora de la boda: viernes 18 de diciembre de 2026, 6:00 p. m.
  var WEDDING_DATE = new Date("2026-12-18T18:00:00");

  // Música de fondo:
  //  - YOUTUBE_ID: el video de YouTube que suena de fondo.
  //  - MP3: si algún día subes la canción como archivo (ej: "assets/audio/musica.mp3"),
  //    ponla aquí y se usará en lugar de YouTube (es lo más seguro en iPhone).
  //  Si existe el archivo MP3 se usa ese (sin anuncios). Si no existe,
  //  se usa YouTube automáticamente como respaldo.
  var MUSIC = {
    MP3: "assets/audio/musica.mp3",
    YOUTUBE_ID: "1j67RTRKNe4"
  };

  // Confirmación de asistencia por WhatsApp
  var WHATSAPP_NUMBER = "18092647349"; // 809-264-7349
  // ================================================

  var ALT = "hsl(88 13% 40%)";  // verde salvia oscuro
  var MAIN = "hsl(36 40% 88%)"; // beige claro

  var $ = function (sel) { return document.querySelector(sel); };
  var params = new URLSearchParams(window.location.search);

  // ---------- Plantillas (esquinas y divisores) ----------
  document.querySelectorAll(".corners").forEach(function (el) {
    el.appendChild($("#cornersTpl").content.cloneNode(true));
  });
  document.querySelectorAll(".gold-divider").forEach(function (el) {
    el.appendChild($("#goldDividerTpl").content.cloneNode(true));
  });

  // ---------- Invitados por enlace (?nombres=Ana,Luis&acompanantes=1) ----------
  var nombres = [];
  var nombresParam = params.get("nombres");
  if (nombresParam) {
    nombres = nombresParam.split(",").map(function (n) { return n.trim().replace(/\+/g, " "); }).filter(Boolean);
  }
  var acompanantes = parseInt(params.get("acompanantes") || "0", 10) || 0;

  if (nombres.length) {
    $("#guestsTotal").textContent = nombres.length + acompanantes;
    if (acompanantes > 0) {
      var comp = $("#guestsCompanions");
      comp.textContent = "(" + acompanantes + " acompañante" + (acompanantes > 1 ? "s" : "") + ")";
      comp.hidden = false;
    }
    var list = $("#guestsList");
    nombres.forEach(function (nombre, i) {
      var chip = document.createElement("div");
      chip.className = "guest-chip";
      chip.textContent = nombre;
      chip.style.transitionDelay = (i * 0.1) + "s";
      list.appendChild(chip);
    });
    $('[data-section="guests"]').hidden = false;
  }

  // ---------- Colores alternados (verde / beige) ----------
  var visibles = Array.prototype.filter.call(document.querySelectorAll("[data-section]"), function (el) { return !el.hidden; });
  visibles.forEach(function (el, i) {
    var color = i % 2 === 0 ? ALT : MAIN;
    el.style.background = color;
    el.classList.toggle("tone-green", color === ALT);
  });

  // ---------- Confirmar asistencia (mensaje formal por WhatsApp) ----------
  (function () {
    var quien = nombres.join(", ");
    if (nombres.length && acompanantes > 0) {
      quien += " (+" + acompanantes + " acompañante" + (acompanantes > 1 ? "s" : "") + ")";
    }
    var mensaje =
      "¡Hola! Confirmo mi asistencia a la boda de Alexander y Wanda " +
      "el viernes 18 de diciembre a las 6:00 p. m." +
      (nombres.length ? "\n\nNombre: " + quien : "") +
      "\n\n¡Gracias por la invitación!";
    $("#confirmBtn").href = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(mensaje);
  })();

  // =================================================
  //  MÚSICA
  //  La música empieza a cargar y sonar en silencio desde que se abre el enlace.
  //  Al tocar "Ingresar con música" (primera interacción) solo se le quita el
  //  silencio, así Safari/iPhone la deja sonar sin errores.
  // =================================================
  var player = createPlayer();
  var musicOn = false;
  var toggle = $("#musicToggle");

  function createPlayer() {
    var silent = { play: function () {}, pause: function () {} };
    if (!MUSIC.MP3) return MUSIC.YOUTUBE_ID ? youtubePlayer(MUSIC.YOUTUBE_ID) : silent;

    // Intenta el MP3; si el archivo no existe, cambia a YouTube sin que se note.
    var active = mp3Player(MUSIC.MP3);
    var pending = null;
    $("#music").addEventListener("error", function () {
      if (!MUSIC.YOUTUBE_ID || active.isYoutube) return;
      active = youtubePlayer(MUSIC.YOUTUBE_ID);
      active.isYoutube = true;
      if (pending === "play") active.play(true);
    }, { once: true });
    return {
      play: function (fromStart) { pending = "play"; active.play(fromStart); },
      pause: function () { pending = "pause"; active.pause(); }
    };
  }

  // --- Archivo MP3 propio ---
  function mp3Player(src) {
    var audio = $("#music");
    audio.src = src;
    audio.muted = true;
    var pre = audio.play(); // arranca en silencio (permitido por los navegadores)
    if (pre && pre.catch) pre.catch(function () {});
    return {
      play: function (fromStart) {
        if (fromStart) { try { audio.currentTime = 0; } catch (e) {} }
        audio.muted = false;
        var p = audio.play();
        if (p && p.catch) p.catch(function () {});
      },
      pause: function () { audio.pause(); }
    };
  }

  // --- YouTube (reproductor oculto, solo audio) ---
  function youtubePlayer(id) {
    var ready = false;
    var queue = [];
    var iframe = document.createElement("iframe");
    iframe.title = "Música de fondo";
    iframe.setAttribute("allow", "autoplay; encrypted-media");
    iframe.setAttribute("playsinline", "");
    iframe.src = "https://www.youtube.com/embed/" + id +
      "?enablejsapi=1&autoplay=1&mute=1&loop=1&playlist=" + id +
      "&controls=0&playsinline=1&rel=0&modestbranding=1&origin=" + encodeURIComponent(location.origin);
    $("#ytHolder").appendChild(iframe);

    function send(func, args) {
      if (!iframe.contentWindow) return;
      iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: func, args: args || [] }), "*");
    }
    function cmd(func, args) {
      if (ready) send(func, args); else queue.push([func, args]);
    }
    // Avisar a YouTube que escuchamos sus eventos y detectar cuándo está listo
    iframe.addEventListener("load", function () {
      var tries = 0;
      var hello = setInterval(function () {
        tries++;
        if (!iframe.contentWindow || ready || tries > 40) return clearInterval(hello);
        iframe.contentWindow.postMessage(JSON.stringify({ event: "listening", id: "bg-music" }), "*");
      }, 250);
    });
    window.addEventListener("message", function (e) {
      if (typeof e.data !== "string" || e.origin.indexOf("youtube") === -1) return;
      var data; try { data = JSON.parse(e.data); } catch (err) { return; }
      if (!ready && (data.event === "onReady" || data.event === "initialDelivery" || data.event === "infoDelivery")) {
        ready = true;
        queue.forEach(function (q) { send(q[0], q[1]); });
        queue = [];
      }
    });
    return {
      play: function (fromStart) {
        if (fromStart) cmd("seekTo", [0, true]);
        cmd("unMute");
        cmd("setVolume", [100]);
        cmd("playVideo");
      },
      pause: function () { cmd("pauseVideo"); }
    };
  }

  function setMusic(on, fromStart) {
    musicOn = on;
    toggle.classList.toggle("is-playing", on);
    if (on) player.play(fromStart); else player.pause();
  }

  // ---------- Portada ----------
  var cover = $("#cover");
  var invitation = $("#invitation");

  document.querySelectorAll("[data-enter]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      // Se ejecuta dentro del mismo toque para que Safari lo permita
      if (btn.getAttribute("data-enter") === "music") setMusic(true, true);
      else setMusic(false);
      cover.classList.add("is-exiting");
      setTimeout(function () {
        cover.remove();
        invitation.hidden = false;
        toggle.hidden = false;
        startInvitation();
      }, 800);
    });
  });

  toggle.addEventListener("click", function () { setMusic(!musicOn); });

  document.addEventListener("visibilitychange", function () {
    if (invitation.hidden) return;
    if (document.hidden) player.pause();
    else if (musicOn) player.play(false);
  });

  // ---------- Ventanas "Ver más" ----------
  var lastFocus = null;
  function openModal(id) {
    var m = document.getElementById(id);
    if (!m) return;
    lastFocus = document.activeElement;
    m.hidden = false;
    document.body.classList.add("modal-open");
    var close = m.querySelector(".modal-close");
    if (close) close.focus();
  }
  function closeModals() {
    document.querySelectorAll(".modal").forEach(function (m) { m.hidden = true; });
    document.body.classList.remove("modal-open");
    if (lastFocus) lastFocus.focus();
  }
  document.querySelectorAll("[data-modal]").forEach(function (b) {
    b.addEventListener("click", function () { openModal(b.getAttribute("data-modal")); });
  });
  document.querySelectorAll("[data-close]").forEach(function (b) {
    b.addEventListener("click", closeModals);
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModals(); });

  // ---------- Al entrar ----------
  function startInvitation() {
    setupReveal();
    startCountdown();
  }

  function setupReveal() {
    var items = document.querySelectorAll("[data-anim]");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    items.forEach(function (el) { io.observe(el); });
  }

  function startCountdown() {
    var els = { d: $("#cd-days"), h: $("#cd-hours"), m: $("#cd-minutes"), s: $("#cd-seconds") };
    function pad(n) { return String(n).padStart(2, "0"); }
    function tick() {
      var diff = Math.max(WEDDING_DATE.getTime() - Date.now(), 0);
      els.d.textContent = pad(Math.floor(diff / 86400000));
      els.h.textContent = pad(Math.floor(diff / 3600000) % 24);
      els.m.textContent = pad(Math.floor(diff / 60000) % 60);
      els.s.textContent = pad(Math.floor(diff / 1000) % 60);
    }
    tick();
    setInterval(tick, 1000);
  }
})();

/* Copiar número de cuenta (Mesa de regalos) */
(function () {
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.left = "-9999px";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }
  document.querySelectorAll("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var text = b.getAttribute("data-copy");
      function done() {
        b.textContent = "¡Copiado!";
        b.classList.add("is-copied");
        setTimeout(function () { b.textContent = "Copiar"; b.classList.remove("is-copied"); }, 2000);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text); done(); });
      } else { fallbackCopy(text); done(); }
    });
  });
})();
