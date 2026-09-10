var e=`gio_unlocked_until`,t=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches;function n(){try{return Number(localStorage.getItem(e))>Date.now()}catch{return!1}}function r(){try{localStorage.setItem(e,String(Date.now()+2592e6))}catch{}}function i(){try{localStorage.removeItem(e)}catch{}location.reload()}function a(e){return e.trim().toLowerCase()===`necesito`}function o(){let e=document.createElement(`button`);e.type=`button`,e.textContent=`lås igen`,e.className=`fixed right-3 bottom-3 z-40 cursor-pointer font-mono text-[11px] tracking-wide text-text-dim transition-colors hover:text-text-muted focus-visible:outline-2 focus-visible:outline-accent`,e.addEventListener(`click`,i),document.body.appendChild(e)}function s(e){e.hidden=!1,t||e.animate([{opacity:0},{opacity:1}],{duration:350,easing:`ease-out`}),o()}function c(e,n){let i=document.createElement(`div`);i.className=`fixed inset-0 z-50 flex items-center justify-center bg-bg-deep px-6 text-center`,i.innerHTML=`
    <form class="flex w-full max-w-xs flex-col items-center gap-5">
      <p class="font-mono text-sm tracking-loose text-text-muted">Kun for Gio.</p>
      <label class="sr-only" for="gioCode">Kode</label>
      <input
        id="gioCode"
        type="password"
        autocomplete="off"
        autocapitalize="none"
        class="w-full rounded-hud border-[1.5px] border-border bg-[rgba(4,7,14,0.7)] px-4 py-3 text-center font-mono text-sm tracking-wide text-ink focus-visible:outline-2 focus-visible:outline-accent"
      />
      <button type="submit" class="pill px-8">LUK OP</button>
      <p id="gioTryAgain" class="text-xs text-text-dim" aria-live="polite" hidden>Prøv igen.</p>
    </form>`,document.body.appendChild(i);let o=i.querySelector(`form`),c=i.querySelector(`#gioCode`),l=i.querySelector(`#gioTryAgain`);c.focus(),o.addEventListener(`submit`,o=>{if(o.preventDefault(),a(c.value)){if(r(),t)i.remove(),s(e),n();else{let t=i.animate([{opacity:1},{opacity:0}],{duration:300,easing:`ease-in`});t.onfinish=()=>{i.remove(),s(e),n()}}return}l.hidden=!1,t||c.animate([{transform:`translateX(0)`},{transform:`translateX(-7px)`},{transform:`translateX(6px)`},{transform:`translateX(-4px)`},{transform:`translateX(0)`}],{duration:320,easing:`ease-out`}),c.select()})}function l(){let e=document.querySelector(`main`);return new Promise(t=>{if(n()){s(e),t();return}c(e,t)})}export{l as t};