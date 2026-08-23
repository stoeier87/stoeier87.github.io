var e=class extends HTMLElement{connectedCallback(){let e=this.getAttribute(`heading`)??``,t=this.getAttribute(`accent`)??``,n=this.getAttribute(`subtitle`)??``,r=this.getAttribute(`icon`),i=this.hasAttribute(`icon-hidden`),a=r?`<i class="fa-solid ${r}${i?` hidden`:``}"></i> `:``,o=t?` <span class="red">${t}</span>`:``;this.innerHTML=`
      <header>
        <h1>${a}${e}${o}</h1>
        <p class="sub">${n}</p>
      </header>`}};function t(){customElements.get(`st-page-header`)||customElements.define(`st-page-header`,e)}export{t};