class Timer24hCard extends HTMLElement {
  set hass(hass) {
    if (!this.config) {
      return;
    }

    if (!this.card) {
      this.card = document.createElement('ha-card');
      this.appendChild(this.card);
    } else {
      this.card.innerHTML = '';
    }
    
    this.card.appendChild(this._header(hass));
    this.card.appendChild(this._content(hass));
  }

  setConfig(config) {
    for (const property of ['title', 'toggle', 'entities']) {
      if (!config[property]) {
        throw new Error('You need to define ' + property);
      }
    }
    for (const entity of config.entities) {
      if (!entity) {
        throw new Error('You need to define entity');
      }      
    }
    this.config = config;
  }

  getCardSize() {
    return this.config.entities.length + 1;
  }
  
  _header(hass) {
    const header = document.createElement("div");
    header.classList.add('card-header')
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    const title = document.createElement('div');
    title.classList.add('name')
    title.innerText = this.config.title;
    header.appendChild(title);
    const toggle = document.createElement('ha-switch');
    toggle.style.padding = '13px 5px';
    toggle.style.margin = '-4px -0px';
    toggle.checked = hass.states[this.config.toggle].state == 'on';
    toggle.addEventListener("change", () => {
      hass.callService('input_boolean', 'toggle', {
        'entity_id': this.config.toggle,
      });
    });    
    header.appendChild(toggle);
    return header;
  }
  
  _content(hass) {
    const content = document.createElement('div');
    content.style.padding = '0px 16px 8px';
    for (const entity of this.config.entities) {
      const row = document.createElement('div');
      row.classList.add('card-content');
      row.style.padding = '0px 0px 8px';
      const state = hass.states[entity.entity];
      if (state) {
        row.innerText = 
          entity.name || state.attributes.friendly_name || state.entity_id;
        row.appendChild(_createTimer(state, hass));
      } else {
        row.innerText = 'Entity ' + entity.entity + ' not found.';
      }
      content.appendChild(row);
    }
    return content;
  }
}

const ON = 'seagreen';
const OFF = 'tomato';

function _createTimer(entity, hass) {
  const timer = document.createElement('div');
  for (var i = 0; i < 24; i++) {
    const button = document.createElement("BUTTON");
    button.hass = hass;
    button.timer = timer;
    button.entity = entity;
    button.type = 'button';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.margin = '0px';
    button.style.padding = '0px 1px';
    // JS converts numbers to 32 bits signed integers for bitwise operations
    button.style.backgroundColor = 
      (entity.state & Math.pow(2, i)) ? ON : OFF;
    button.innerText = ((i < 10) ? '0' : '') + i.toString();
    button.onclick = _onclick;
    timer.appendChild(button);
  }
  return timer;
}

function _onclick() { 
  this.style.backgroundColor = 
    (this.style.backgroundColor == ON) ? OFF : ON;
  var value = 0;
  for (const button of this.timer.children) {
    if (button.style.backgroundColor == ON) {
      value += Math.pow(2, Number(button.innerText));
    }
  }
  this.hass.callService('input_number', 'set_value', {
    'entity_id': this.entity.entity_id,
    'value': value
  });
}

customElements.define('timer-24h-card', Timer24hCard);
