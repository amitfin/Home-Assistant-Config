// JS converts numbers to 32 bits signed integers for bitwise operations
const HALF_DAY_BITS = 24;
const AM_MASK = Math.pow(2, HALF_DAY_BITS) - 1;
const PM_SHIFT = Math.pow(2, HALF_DAY_BITS);
const ON_BACKGROUND = 'forestgreen';
const ON_TEXT = 'white';
var OFF_BACKGROUND;
var OFF_TEXT;
const DIALOG_ROW = 8;

class Timer24hCard extends HTMLElement {
  set hass(hass) {
    if (!this.config) {
      return;
    }
    
    OFF_BACKGROUND = getComputedStyle(document.documentElement).
      getPropertyValue('--card-background-color');
    OFF_TEXT = getComputedStyle(document.documentElement).
      getPropertyValue('--primary-text-color');

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
    const header = document.createElement('DIV');
    header.classList.add('card-header')
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    const title = document.createElement('DIV');
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
    const content = document.createElement('DIV');
    content.style.padding = '0px 16px 8px';
    for (const entity of this.config.entities) {
      const row = document.createElement('DIV');
      row.classList.add('card-content');
      row.style.padding = '0px 0px 8px';
      const state = hass.states[entity.entity];
      if (state) {
        const name = 
          entity.name || state.attributes.friendly_name || state.entity_id;
        row.innerText = name;
        row.appendChild(_createTimer(
          state, this.config.title + ': ' + name, hass, enabled));
      } else {
        row.innerText = 'Entity not found: ' + entity.entity;
      }
      content.appendChild(row);
    }
    return content;
  }
}

function _createTimer(entity, name, hass, enabled) {
  const timer = _createTimerButtons(entity, enabled);
  const dialog = _createDialog(entity, name, hass);
  timer.appendChild(dialog);
  timer.dialog = dialog;
  return timer;
}

function _createTimerButtons(entity, enabled) {
  const am = entity.state & AM_MASK;
  const pm = entity.state / PM_SHIFT;  
  const timer = document.createElement('DIV');
  const onclick = function() { timer.dialog.show(); };
  for (var i = 0; i < (HALF_DAY_BITS * 2); i++) {
    const button = document.createElement('BUTTON');
    button.type = 'button';
    button.style.width = '8px';
    button.style.height = '20px';
    button.style.padding = '0px';
    button.style.border = '1px solid silver';
    button.style.margin = '0px';
    if (i > 0) {
      button.style.marginLeft = '-1px';
    }
    if (enabled) {
      if ((i < HALF_DAY_BITS ? am : pm) & Math.pow(2, (i % HALF_DAY_BITS))) {
        button.style.backgroundColor = ON_BACKGROUND;
      } else {
        button.style.backgroundColor = OFF_BACKGROUND;
      }
      button.onclick = onclick;
      button.style.cursor = 'pointer';
    } else {
      button.disabled = true;
      button.style.backgroundColor = 'gray';
    }
    timer.appendChild(button);
  }
  timer.appendChild(_createTimerHours(timer, enabled));
  return timer;
}

function _createTimerHours(timer, enabled) {
  const onclick = function() { timer.dialog.show(); };
  const table = document.createElement('TABLE');
  table.style.marginTop = '-8px';
  table.style.borderSpacing = '0px';
  const tr = document.createElement('TR');
  table.appendChild(tr);
  for (var i = 0; i < 24; i++) {
    const td = document.createElement('TD');
    td.style.fontSize = 'x-small';
    td.style.textAlign = 'center';
    td.style.width = '14px';
    td.style.padding = '0px';
    if (enabled) {
      td.onclick = onclick;
      td.style.cursor = 'pointer';    
    }
    td.innerText = ((i < 10) ? '0' : '' ) + i.toString();
    tr.appendChild(td);
  }
  return table;
}

function _createDialog(entity, name, hass) {
  const am = entity.state & AM_MASK;
  const pm = entity.state / PM_SHIFT;
  const dialog = document.createElement('ha-dialog');
  dialog.heading = name;
  dialog.open = false;
  dialog.addEventListener('closing', () => { 
    _onClosingDialog(dialog, entity.entity_id, hass);
  });
  for (var i = 0; i < (HALF_DAY_BITS * 2); i++) {
    const button = document.createElement('BUTTON');
    button.type = 'button';
    button.style.textAlign = 'center';
    button.style.width = '40px';
    button.style.height = '40px';
    button.style.padding = '0px';
    button.style.border = '1px solid silver'; 
    button.style.margin = '0px';
    button.style.cursor = 'pointer';
    if (i % DIALOG_ROW !== 0) {
      button.style.marginLeft = '-1px';
    }
    if (i >= DIALOG_ROW) {
      button.style.marginTop = '-1px';
    }
    const hour = Math.floor(i / 2);
    button.innerText = 
      ((hour < 10) ? '0' : '') + hour.toString() +
      ((i % 2 === 0) ? ':00' : ':30');
    if ((i < HALF_DAY_BITS ? am : pm) & Math.pow(2, (i % HALF_DAY_BITS))) {
      button.style.color = ON_TEXT;
      button.style.backgroundColor = ON_BACKGROUND;
    } else {
      button.style.color = OFF_TEXT;
      button.style.backgroundColor = OFF_BACKGROUND;
    }
    button.onclick = _onClickDialog;
    dialog.appendChild(button);
    if ((i + 1) % DIALOG_ROW === 0) {
      dialog.appendChild(document.createElement('BR'));
    }
  }

  return dialog; 
}

function _onClickDialog() {
  if (this.style.backgroundColor == ON_BACKGROUND) {
    this.style.color = OFF_TEXT;
    this.style.backgroundColor = OFF_BACKGROUND;
  } else {
    this.style.color = ON_TEXT;
    this.style.backgroundColor = ON_BACKGROUND;
  }
}

function _onClosingDialog(dialog, entity_id, hass) {
  var value = 0;
  var index = 0;
  for (const element of dialog.children) {
    if (element.nodeName !== 'BUTTON') {
      continue;
    }
    if (element.style.backgroundColor == ON_BACKGROUND) {
      value += Math.pow(2, index);
    }
    index++;
  }
  hass.callService('input_number', 'set_value', {
    'entity_id': entity_id,
    'value': value
  });
}

customElements.define('timer-24h-card', Timer24hCard);
