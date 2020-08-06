class Timer24hCard extends HTMLElement {
  set hass(hass) {
    if (!this.config) {
      return;
    }

    if (!this.content) {
      this.card = document.createElement('ha-card');
      this.content = document.createElement('div');
      this.content.style.padding = '0px 16px 8px';
      this.card.appendChild(this.content);
      this.appendChild(this.card);
    }
    
    this.card.header = this.config.title;
    this.content.innerHTML = '';
    
    for (const entity of this.config.entities) {
      const content = document.createElement('div');
      content.classList.add('card-content');
      content.style.padding = '0px 0px 8px';
      const state = hass.states[entity.entity];
      if (state) {
        content.innerText = 
          entity.name || state.attributes.friendly_name || state.entity_id;
        content.appendChild(_createTimer(state, hass));
      } else {
        content.innerText = 'Entity ' + entity.entity + ' not found.';
      }
      this.content.appendChild(content);
    }
  }

  setConfig(config) {
    for (const property of ['title', 'entities']) {
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
