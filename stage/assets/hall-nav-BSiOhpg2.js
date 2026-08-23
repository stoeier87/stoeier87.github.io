var e=class extends HTMLElement{connectedCallback(){let e=this.getAttribute(`nav-label`)??``,t=this.getAttribute(`back-href`)??`../`,n=this.getAttribute(`back-label`)??`Back to homepage`,r=this.getAttribute(`second-href`)??``,i=this.getAttribute(`second-icon`)??``,a=this.getAttribute(`second-icon-class`)??`red`,o=this.getAttribute(`second-label`)??``,s=this.getAttribute(`max-width`)===`screen`;this.innerHTML=`
      <nav class="hall-nav ${s?`full-screen`:``}" aria-label="${e}">
        <a class="pill back" href="${t}" aria-label="${n}" title="${n}">
          <span class="arrow"><i class="fa-solid fa-arrow-left-long"></i></span>
          <span class="alien" aria-hidden="true">
            <svg viewBox="0 0 26 26" width="17" height="17">
              <ellipse cx="13" cy="15" rx="8.5" ry="10" fill="#7eb08a" />
              <ellipse cx="9.6" cy="13.4" rx="2.1" ry="3" fill="#0a1018"
                       transform="rotate(-18 9.6 13.4)" />
              <ellipse cx="16.4" cy="13.4" rx="2.1" ry="3" fill="#0a1018"
                       transform="rotate(18 16.4 13.4)" />
              <path class="alien-arm" d="M20.5 16.5 L25 11"
                    stroke="#7eb08a" stroke-width="2.3" stroke-linecap="round" fill="none" />
            </svg>
          </span>
        </a>
        ${r&&i&&o?`
        <a class="pill" href="${r}">
          <span class="arrow"><i class="fa-solid ${i} ${a}"></i></span>
          ${o}
        </a>
        `:``}
      </nav>`}};function t(){customElements.get(`st-hall-nav`)||customElements.define(`st-hall-nav`,e)}export{t};