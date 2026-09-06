/* ============================================================
   ANALYTICS — cookieless, event-first, and silent until configured.

   The point of measuring this shop is not pageviews. It is which of twenty
   one-of-one pieces make a stranger open WhatsApp, because that click IS the
   sale here — there is no cart to instrument. So the script records the
   intent event as carefully as the page.

   SET IT UP: create a free site at goatcounter.com, then put the code you
   chose (the "yourname" in yourname.goatcounter.com) into SITE below.
   Until that is filled in, every function here is a no-op — nothing loads,
   nothing is sent, and no third-party request leaves the page. Same contract
   as the retail figures: the mechanism ships, the claim waits for real data.

   Why GoatCounter and not Google Analytics: no cookies, so no consent banner
   is required; ~3.5KB against ~50KB; and it does not build a profile of the
   visitor. This audience is on phones and mobile data — the analytics should
   not cost more than a product photograph.
   ============================================================ */
(function () {
  'use strict';

  var SITE = 'rinshad';   /* rinshad.goatcounter.com */

  if (!SITE) return;      /* unconfigured: do nothing at all */

  /* Respect an explicit opt-out; also keeps our own visits out of the data. */
  if (navigator.doNotTrack === '1' || window.localStorage.getItem('reworn-noanalytics')) return;

  var endpoint = 'https://' + SITE + '.goatcounter.com/count';

  function send(path, title, event) {
    try {
      var img = new Image();
      var q = '?p=' + encodeURIComponent(path) +
              '&t=' + encodeURIComponent(title || '') +
              '&r=' + encodeURIComponent(document.referrer || '') +
              (event ? '&e=true' : '') +
              '&rnd=' + Math.random().toString(36).slice(2);
      img.src = endpoint + q;
    } catch (e) { /* analytics must never break the page */ }
  }

  /* ---- the page ---- */
  send(location.pathname + location.search, document.title);

  /* ---- the intent ----
     A WhatsApp click is the closest thing this site has to a checkout. It is
     recorded as an event named for the piece, so the report reads as a list of
     which garments actually made someone start a conversation. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="wa.me"]');
    if (!a) return;

    var id = '';
    try {
      /* the pre-filled message names the piece; the URL carries the id */
      id = new URLSearchParams(location.search).get('id') || '';
    } catch (err) { /* ignore */ }

    send('ask-whatsapp' + (id ? '/' + id : ''),
         'WhatsApp: ' + (document.title || '').replace(' — REWORN.', ''),
         true);
  }, true);
})();
