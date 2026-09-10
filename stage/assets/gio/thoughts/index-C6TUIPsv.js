import"../../tailwind-BkhYYqiH.js";import{t as e}from"../../gate-CoqBL0x4.js";var t={lastRun:null,entries:[{date:`2026-09-10`,body:`Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed sailing across the ocean of my mind, I keep finding you on every horizon.

Bla bla placeholder — this is the first entry, published today, so the feed can be validated. Real thoughts replace this one.`}]};function n(e){return String(e).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`)}function r(e){return String(e).split(/\n\s*\n/).map(e=>`<p>${n(e).replaceAll(`
`,`<br />`)}</p>`).join(``)}var i=[`ene`,`feb`,`mar`,`abr`,`may`,`jun`,`jul`,`ago`,`sep`,`oct`,`nov`,`dic`];function a(e){let[,t,n]=e.split(`-`).map(Number);return`${n} ${i[t-1]}`}var o=[...t.entries].sort((e,t)=>e.date<t.date?1:-1),s=document.getElementById(`feed`);s.innerHTML=o.length===0?`<p class="text-center text-sm leading-relaxed text-text-muted">Aún no hay pensamientos — el primero llega pronto.</p>`:o.map(e=>`
    <article class="flex flex-col gap-3 rounded-card border border-border-faint bg-card-bg px-6 py-6 backdrop-blur-[2px]">
      <p class="flex items-center gap-2 text-xs tracking-loose text-text-dim">
        <span class="text-accent" aria-hidden="true">♥</span>${n(a(e.date))}
      </p>
      <div lang="en" class="flex flex-col gap-3 text-base leading-relaxed text-ink">${r(e.body)}</div>
    </article>`).join(``),e();