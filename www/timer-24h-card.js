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
    for (const timer of config.entities) {
      if (!timer.entity) {
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
    if (hass.states[this.config.toggle]) {
      toggle.checked = hass.states[this.config.toggle].state == 'on';
      toggle.addEventListener('change', () => {
        hass.callService('input_boolean', 'toggle', {
          'entity_id': this.config.toggle,
        });
      }); 
    } else {
      toggle.disabled = true;
    }
   
    header.appendChild(toggle);
    return header;
  }
  
  _content(hass) {
    const enabled = hass.states[this.config.toggle] && 
      hass.states[this.config.toggle].state == 'on';
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
        row.appendChild(_createTimer(state, hass, enabled));
      } else {
        row.innerText = 'Entity not found: ' + entity.entity;
      }
      content.appendChild(row);
    }
    return content;
  }
}

const ON_BACKGROUND = 'forestgreen';
const ON_TEXT = 'white';
var OFF_BACKGROUND;
var OFF_TEXT;

function _createTimer(entity, hass, enabled) {
  OFF_BACKGROUND = getComputedStyle(document.documentElement).
    getPropertyValue('--card-background-color');
  OFF_TEXT = getComputedStyle(document.documentElement).
    getPropertyValue('--primary-text-color');

  const timer = document.createElement('div');
  for (var i = 0; i < 24; i++) {
    const button = document.createElement("BUTTON");
    button.hass = hass;
    button.timer = timer;
    button.entity = entity;
    button.type = 'button';
    button.style.padding = '0px';
    button.style.border = '1px solid silver'; 
    button.style.margin = '0px';
    if (i > 0) {
      button.style.marginLeft = '-1px';
    }
    button.innerText = ((i < 10) ? '0' : '') + i.toString();
    if (enabled) {
      // JS converts numbers to 32 bits signed integers for bitwise operations
      if (entity.state & Math.pow(2, i)) {
        button.style.color = ON_TEXT;
        button.style.backgroundColor = ON_BACKGROUND;
      } else {
        button.style.color = OFF_TEXT;
        button.style.backgroundColor = OFF_BACKGROUND;
      }
      button.onclick = _onclick;
    } else {
      button.disabled = true;
      button.style.backgroundColor = 'gray';
      button.style.color = 'white';
    }
    timer.appendChild(button);
  }
  return timer;
}

function _onclick() {
  if (this.style.backgroundColor == ON_BACKGROUND) {
    this.style.color = OFF_TEXT;
    this.style.backgroundColor = OFF_BACKGROUND;
  } else {
    this.style.color = ON_TEXT;
    this.style.backgroundColor = ON_BACKGROUND;
  }
  var value = 0;
  for (const button of this.timer.children) {
    if (button.style.backgroundColor == ON_BACKGROUND) {
      value += Math.pow(2, Number(button.innerText));
    }
  }
  this.hass.callService('input_number', 'set_value', {
    'entity_id': this.entity.entity_id,
    'value': value
  });
}

customElements.define('timer-24h-card', Timer24hCard);
