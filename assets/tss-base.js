/*
  TSS Base — scroll-reveal engine and carousel rail progress.
  Idempotent: safe to load more than once.
*/
(function () {
  if (window.__tssBaseReady) return;
  window.__tssBaseReady = true;

  var SELECTOR = '.tss-rise, .tss-reveal, .tss-clip';

  var io =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (!entry.isIntersecting) return;
              var el = entry.target;
              var delay = parseFloat(el.getAttribute('data-tss-delay') || '0');
              if (delay) {
                setTimeout(function () {
                  el.classList.add('is-in');
                }, delay * 1000);
              } else {
                el.classList.add('is-in');
              }
              io.unobserve(el);
            });
          },
          { rootMargin: '0px 0px -12% 0px', threshold: 0.15 }
        )
      : null;

  function observe(root) {
    var nodes = root.querySelectorAll(SELECTOR);
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].__tssSeen) continue;
      nodes[i].__tssSeen = true;
      if (io) io.observe(nodes[i]);
      else nodes[i].classList.add('is-in');
    }
  }

  function bindRails(root) {
    var rails = root.querySelectorAll('.tss-rail[data-progress]');
    for (var i = 0; i < rails.length; i++) {
      (function (rail) {
        if (rail.__tssBound) return;
        rail.__tssBound = true;

        var bar = document.querySelector('#' + rail.getAttribute('data-progress') + ' > span');
        if (!bar) return;

        function update() {
          var max = rail.scrollWidth - rail.clientWidth;
          var ratio = max > 0 ? rail.scrollLeft / max : 0;
          var thumb = Math.max((rail.clientWidth / (rail.scrollWidth || 1)) * 100, 12);
          bar.style.width = thumb + '%';
          bar.style.marginLeft = ratio * (100 - thumb) + '%';
        }

        rail.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        update();
      })(rails[i]);
    }
  }

  function init(root) {
    root = root || document;
    observe(root);
    bindRails(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init(document);
    });
  } else {
    init(document);
  }

  document.addEventListener('shopify:section:load', function (e) {
    init(e.target);
  });

  window.tssInit = init;
})();
