import"../tailwind-DHf83s9g.js";import{t as e}from"../firebase-config-CLc0baU0.js";import{initializeApp as t}from"https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";import{getDatabase as n,limitToLast as r,onValue as i,orderByChild as a,query as o,ref as s}from"https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";var c=t(e,`arcade-scoreboard`),l=n(c),u=[{key:`orbit-runner`,label:`Orbit Runner`},{key:`meteor-dodge`,label:`Meteor Dodge`},{key:`iss-docking`,label:`ISS Docking`},{key:`phobos-lander`,label:`Phobos Lander`},{key:`comet-pong`,label:`Comet Pong`},{key:`star-memory`,label:`Star Memory`},{key:`nebula-trail`,label:`Nebula Trail`},{key:`asteroid-breaker`,label:`Asteroid Breaker`}],d=5;function f(e){return String(e).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`)}function p(e,t){return(t?e:e.slice(0,d)).map((e,t)=>`
    <tr data-rank="${t+1}">
      <td class="rank">${t+1}</td>
      <td>${f(e.name??`Unknown`)}</td>
      <td class="col-score">${Number(e.score??0).toLocaleString()}</td>
    </tr>`).join(``)}function m(e){let t=document.createElement(`div`);t.className=`board-card is-loading`,t.innerHTML=`
    <div class="board-card-header">
      <h2>${f(e.label)}</h2>
      <span class="top-score">—</span>
    </div>
    <div class="board-card-body">
      <table>
        <thead><tr><th class="rank">#</th><th>Name</th><th class="col-score">Score</th></tr></thead>
        <tbody class="board-tbody"><tr class="loading-row"><td colspan="3">Loading…</td></tr></tbody>
      </table>
    </div>`;let n=!1,c=[],u=t.querySelector(`.top-score`),m=t.querySelector(`.board-tbody`),h=s(l,`arcade/scores/${e.key}`),g=o(h,a(`score`),r(50));i(g,r=>{if(c=[],r.forEach(e=>{c.push(e.val())}),c.sort((e,t)=>t.score-e.score||e.createdAt-t.createdAt),console.log(`[${e.key}] exists:${r.exists()} size:${r.size} rows:${c.length}`,r.val()),t.classList.remove(`is-loading`),!c.length){t.style.display=`none`;return}t.style.display=``,u.textContent=Number(c[0].score).toLocaleString(),_();let i=p(c,n);console.log(`[${e.key}] rendering ${c.length} rows, html length: ${i.length}, preview rows in html: ${(i.match(/<tr/g)||[]).length}`),m.innerHTML=i},e=>{t.classList.remove(`is-loading`),m.innerHTML=`<tr class="empty-row"><td colspan="3">Error: ${f(e.message)}</td></tr>`});function _(){let e=t.querySelector(`.board-card-header`),r=e.querySelector(`.expand-btn`);if(c.length<=d){r&&r.remove();return}r||(r=document.createElement(`button`),r.className=`expand-btn`,e.appendChild(r),r.addEventListener(`click`,()=>{n=!n,m.innerHTML=p(c,n),r.textContent=n?`▲ Top ${d}`:`▼ All ${c.length}`})),r.textContent=n?`▲ Top ${d}`:`▼ All ${c.length}`}return t}var h=document.getElementById(`boards`);for(let e of u)h.appendChild(m(e));