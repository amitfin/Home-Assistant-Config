const mdiClose = 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z';

// JS converts numbers to 32-bits signed integers for bitwise operations.
// So, we break the number to two 24-bits, for each 12 hours (2 bits per hour).
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
    if (!this.config || !this._hasChanged(hass)) {
      return;
    }

    if (!this.card) {
      this.card = document.createElement('ha-card');
      this.appendChild(this.card);
      this.open_dialogs = {};
    } else {
      const open_dialogs = {
        ...this.open_dialogs
      };
      this.card.innerHTML = '';
      this.open_dialogs = open_dialogs;
    }

    _setOffColors();
    this.card.appendChild(this._header(hass));
    this.card.appendChild(this._content(hass, this.open_dialogs));
    this.prev_hass = hass;
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
    this.config_changed = true;
  }

  getCardSize() {
    return this.config.entities.length + 1;
  }

  _hasChanged(hass) {
    if (this.config_changed) {
      this.config_changed = false;
      return true;
    }
    if (!this.prev_hass) {
      return true;
    }
    if (this.prev_hass.states[this.config.toggle].state !==
      hass.states[this.config.toggle].state) {
      return true;
    }
    for (const timer of this.config.entities) {
      if (this.prev_hass.states[timer.entity].state !==
        hass.states[timer.entity].state) {
        return true;
      }
    }
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
      toggle.checked = hass.states[this.config.toggle].state === 'on';
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

  _content(hass, open_dialogs) {
    const enabled = hass.states[this.config.toggle] &&
      hass.states[this.config.toggle].state === 'on';
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
          state, this.config.title + ': ' + name, hass, enabled, open_dialogs));
      } else {
        row.innerText = 'Entity not found: ' + entity.entity;
      }
      content.appendChild(row);
    }
    return content;
  }
}

function _setOffColors() {
  OFF_BACKGROUND = getComputedStyle(document.documentElement).
    getPropertyValue('--card-background-color');
  OFF_TEXT = getComputedStyle(document.documentElement).
    getPropertyValue('--primary-text-color');
}

function _createTimer(entity, name, hass, enabled, open_dialogs) {
  const timer = _createTimerButtons(entity, enabled);
  const dialog = _createDialog(entity, name, hass, open_dialogs);
  timer.appendChild(dialog);
  timer.dialog = dialog;
  if (enabled && open_dialogs[name]) {
    dialog.show();
  } else {
    open_dialogs[name] = false;
  }
  return timer;
}

function _createTimerButtons(entity, enabled) {
  const timer = document.createElement('DIV');
  const onclick = function() {
    timer.dialog.show();
  };
  for (var i = 0; i < (HALF_DAY_BITS * 2); i++) {
    const button = document.createElement('BUTTON');
    button.type = 'button';
    button.style.width = '8px';
    button.style.height = '20px';
    button.style.padding = '0px';
    button.style.border = '1px solid silver';
    button.style.outline = 'none';
    button.style.margin = '0px';
    if (i > 0) {
      button.style.marginLeft = '-1px';
    }
    if (enabled) {
      _setButtonColor(button, entity, i);
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

function _setButtonColor(button, entity, index) {
  const bitmap = (index < HALF_DAY_BITS) ?
    (entity.state & AM_MASK) : (entity.state / PM_SHIFT);
  const bit = Math.pow(2, (index % HALF_DAY_BITS));
  if (bitmap & bit) {
    button.style.color = ON_TEXT;
    button.style.backgroundColor = ON_BACKGROUND;
  } else {
    button.style.color = OFF_TEXT;
    button.style.backgroundColor = OFF_BACKGROUND;
  }
}

function _createTimerHours(timer, enabled) {
  const onclick = function() {
    timer.dialog.show();
  };
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
    td.innerText = ((i < 10) ? '0' : '') + i.toString();
    tr.appendChild(td);
  }
  return table;
}

function _createDialog(entity, name, hass, open_dialogs) {
  const dialog = document.createElement('ha-dialog');
  dialog.heading = _dialogHeader(name, dialog, hass);
  dialog.open = false;
  dialog.addEventListener('opening', () => {
    open_dialogs[name] = true;
  });
  dialog.addEventListener('closing', () => {
    open_dialogs[name] = false;
    _onClosingDialog(dialog, entity, hass);
  });
  const content = document.createElement('SPAN');
  dialog.content = content;
  dialog.appendChild(content);
  for (var i = 0; i < (HALF_DAY_BITS * 2); i++) {
    const button = document.createElement('BUTTON');
    button.type = 'button';
    button.style.textAlign = 'center';
    button.style.width = '40px';
    button.style.height = '40px';
    button.style.padding = '0px';
    button.style.border = '1px solid silver';
    button.style.outline = 'none';
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
    _setButtonColor(button, entity, i);
    button.onclick = _onClickDialog;
    content.appendChild(button);
    if ((i + 1) % DIALOG_ROW === 0) {
      content.appendChild(document.createElement('BR'));
    }
  }

  return dialog;
}

function _dialogHeader(name, dialog) {
  const header = document.createElement('DIV');
  header.style.color = OFF_TEXT;
  header.style.display = 'flex';
  const button = document.createElement('mwc-icon-button');
  button.style.marginLeft = '-18px'
  button.onclick = function() {
    dialog.close();
  };
  header.appendChild(button);
  const icon = document.createElement('ha-svg-icon');
  icon.path = mdiClose;
  button.appendChild(icon);
  const title = document.createElement('DIV');
  title.style.margin = '10px 0px 0px 15px';
  title.innerText = name;
  header.appendChild(title);
  return header;
}

function _onClickDialog() {
  if (this.style.backgroundColor === ON_BACKGROUND) {
    this.style.color = OFF_TEXT;
    this.style.backgroundColor = OFF_BACKGROUND;
  } else {
    this.style.color = ON_TEXT;
    this.style.backgroundColor = ON_BACKGROUND;
  }
}

function _onClosingDialog(dialog, entity, hass) {
  var value = 0;
  var index = 0;
  for (const element of dialog.content.children) {
    if (element.nodeName !== 'BUTTON') {
      continue;
    }
    if (element.style.backgroundColor === ON_BACKGROUND) {
      value += Math.pow(2, index);
    }
    index++;
  }
  if (entity.state != value) {
    hass.callService('input_number', 'set_value', {
      'entity_id': entity.entity_id,
      'value': value
    });
  }
}

customElements.define('timer-24h-card', Timer24hCard);