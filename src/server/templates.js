// HTML 模板渲染（中转页 iframe 方案 与 顶级 POST 方案）

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function renderIFrameLoginPage({ action, rec, uid, redirectUrl }) {
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <title>Sedang masuk...</title>
  <style>
    body{margin:0;font:16px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial;background:#0f0f10;color:#fff;display:grid;place-items:center;height:100vh}
    .card{background:#17181a;border-radius:14px;padding:24px 20px;box-shadow:0 10px 30px rgba(0,0,0,.25),0 0 0 1px rgba(255,255,255,.06)}
    .row{display:flex;gap:12px;align-items:center}
    .sp{width:24px;height:24px;border-radius:50%;border:3px solid rgba(255,255,255,.18);border-top-color:#4f8cff;animation:spin 1s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}} h1{margin:0 0 6px;font-size:18px}
  </style>
</head>
<body>
  <div class="card"><div class="row"><div class="sp"></div><div><h1>Sedang masuk</h1><div>Tunggu sebentar, akan dialihkan.</div></div></div></div>
  <iframe name="sink" style="display:none;width:0;height:0;border:0;"></iframe>
  <form id="f" action="${action}" method="POST" target="sink">
    <input type="hidden" name="username" value="${escapeHtml(rec.username)}" />
    <input type="hidden" name="password" value="${escapeHtml(rec.password)}" />
    <input type="hidden" name="device_id" value="${escapeHtml(uid)}" />
  </form>
  <script>
    (function(){
      var redirected=false; var redirectUrl=${JSON.stringify(redirectUrl)};
      function go(){ if(redirected) return; redirected=true; window.location.href=redirectUrl; }
      function submitLogin(){ try{ document.getElementById('f').submit(); }catch(_){}}
      document.addEventListener('DOMContentLoaded', function(){ setTimeout(submitLogin, 30); });
      window.addEventListener('message', function(){ go(); });
      setTimeout(go, 4000);
    })();
  </script>
  <noscript>
    <form action="${action}" method="POST"><input type="hidden" name="username" value="${escapeHtml(rec.username)}"><input type="hidden" name="password" value="${escapeHtml(rec.password)}"><input type="hidden" name="device_id" value="${escapeHtml(uid)}"><button type="submit">Masuk dan buka situs</button></form>
  </noscript>
</body>
</html>`;
}

export function renderFirstPartyLoginPage({ action, rec, uid }) {
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <title>Sedang masuk...</title>
  <style>
    body{margin:0;font:16px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial;background:#0f0f10;color:#fff;display:grid;place-items:center;height:100vh}
    .card{background:#17181a;border-radius:14px;padding:24px 20px;box-shadow:0 10px 30px rgba(0,0,0,.25),0 0 0 1px rgba(255,255,255,.06)}
    .row{display:flex;gap:12px;align-items:center}
    .sp{width:24px;height:24px;border-radius:50%;border:3px solid rgba(255,255,255,.18);border-top-color:#4f8cff;animation:spin 1s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}} h1{margin:0 0 6px;font-size:18px}
  </style>
</head>
<body>
  <div class="card"><div class="row"><div class="sp"></div><div><h1>Sedang masuk</h1><div>Tunggu sebentar, akan dialihkan.</div></div></div></div>
  <form action="${action}" method="POST"><input type="hidden" name="username" value="${escapeHtml(rec.username)}"><input type="hidden" name="password" value="${escapeHtml(rec.password)}"><input type="hidden" name="device_id" value="${escapeHtml(uid)}"><button type="submit">Masuk dan buka situs</button></form>
  <iframe name="sink" style="display:none;width:0;height:0;border:0;"></iframe>
  <form id="f" action="${action}" method="POST" target="sink">
    <input type="hidden" name="username" value="${escapeHtml(rec.username)}" />
    <input type="hidden" name="password" value="${escapeHtml(rec.password)}" />
    <input type="hidden" name="device_id" value="${escapeHtml(uid)}" />
  </form>
  <script>document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){try{document.getElementById('f').submit();}catch(e){}},30);});</script>
</body>
</html>`;
}

