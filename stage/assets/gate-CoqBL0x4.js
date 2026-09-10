var e=`gio_unlocked_until`,t=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches;function n(){try{return Number(localStorage.getItem(e))>Date.now()}catch{return!1}}function r(){try{localStorage.setItem(e,String(Date.now()+2592e6))}catch{}}if(new URLSearchParams(location.search).has(`lock`)){try{localStorage.removeItem(e)}catch{}history.replaceState(null,``,location.pathname)}function i(e){return e.trim().toLowerCase()===`necesito`}function a(e){e.hidden=!1,t||e.animate([{opacity:0},{opacity:1}],{duration:350,easing:`ease-out`})}function o(e,n){let o=document.createElement(`div`);o.className=`fixed inset-0 z-50 flex items-center justify-center bg-bg-deep px-6 text-center`,o.innerHTML=`
    <form class="flex w-full max-w-xs flex-col items-center gap-5">
      <p class="font-mono text-sm tracking-loose text-text-muted">Solo para Gio.</p>
      <label class="sr-only" for="gioCode">Código</label>
      <input
        id="gioCode"
        type="password"
        autocomplete="off"
        autocapitalize="none"
        class="w-full rounded-hud border-[1.5px] border-border bg-[rgba(4,7,14,0.7)] px-4 py-3 text-center font-mono text-sm tracking-wide text-ink focus-visible:outline-2 focus-visible:outline-accent"
      />
      <button type="submit" class="pill px-8">ABRIR</button>
      <p id="gioTryAgain" class="text-xs text-text-dim" aria-live="polite" hidden>Inténtalo otra vez.</p>
    </form>`,document.body.appendChild(o);let s=o.querySelector(`form`),c=o.querySelector(`#gioCode`),l=o.querySelector(`#gioTryAgain`);c.focus(),s.addEventListener(`submit`,s=>{if(s.preventDefault(),i(c.value)){if(r(),t)o.remove(),a(e),n();else{let t=o.animate([{opacity:1},{opacity:0}],{duration:300,easing:`ease-in`});t.onfinish=()=>{o.remove(),a(e),n()}}return}l.hidden=!1,t||c.animate([{transform:`translateX(0)`},{transform:`translateX(-7px)`},{transform:`translateX(6px)`},{transform:`translateX(-4px)`},{transform:`translateX(0)`}],{duration:320,easing:`ease-out`}),c.select()})}function s(){let e=document.querySelector(`main`);return new Promise(t=>{if(n()){a(e),t();return}o(e,t)})}export{s as t};