import{t as e}from"./version-badge-DuiW2ut6.js";var t=[{href:`mailto//:tobias@stoeier.dk`,label:`Email`,iconStyle:`fa-regular`,icon:`fa-envelope`,external:!1},{href:`https://dk.linkedin.com/in/stoeier`,label:`LinkedIn`,iconStyle:`fa-brands`,icon:`fa-linkedin-in`,external:!0},{href:`https://instagram.com/stoeier`,label:`Instagram`,iconStyle:`fa-brands`,icon:`fa-instagram`,external:!0},{href:`https://open.spotify.com/artist/1OrUsE9Nua3bqJKM6lPnDW`,label:`Spotify`,iconStyle:`fa-brands`,icon:`fa-spotify`,external:!0}],n=class extends HTMLElement{connectedCallback(){let n=t.map(e=>`
      <a href="${e.href}"${e.external?` target="_blank" rel="noopener"`:``}>
              <li class="pill">
                  <span class="arrow"><i class="${e.iconStyle} ${e.icon} red"></i></span>
                  <span class="pill-label">${e.label}</span>
                  </li>
            </a>`).join(``);this.innerHTML=`
      <footer>
        <nav class="contact prevent-select" id="contact" aria-label="Kontakt">
          <ul class="pills">${n}
          </ul>
        </nav>
        <a href="https://servicedesign.dk" target="_blank" rel="noopener">servicedesign.dk</a>
      </footer>
    `,e()}};function r(){customElements.get(`st-footer`)||customElements.define(`st-footer`,n)}export{r as t};