const mdiClose = 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z';

const BUTTONS_COUNT = 48
const ON_BACKGROUND = 'forestgreen';
const ON_TEXT = 'white';
var OFF_BACKGROUND;
var OFF_TEXT;
const DIALOG_ROW = 8;

class TimetableCard extends HTMLElement {
  set hass(hass) {
    if (!this.config || !this._hasChanged(hass)) {
      return;
    }

    if (!this.card) {
      this.card = document.createElement('ha-card');
      this.appendChild(this.card);
    } else {
      this.card.innerHTML = '';
    }

    _setOffColors();
    this.card.appendChild(this._header(hass));
    this.card.appendChild(this._content(hass));
    this.prev_hass = hass;
  }

  setConfig(config) {
    for (const property of ['title', 'toggle', 'entities']) {
      if (!config[property]) {
        throw new Error('You need to define ' + property);
      }
    }
    for (const timetable of config.entities) {
      if (!timetable.entity) {
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
    for (const timetable of this.config.entities) {
      if (this.prev_hass.states[timetable.entity].attributes.timetable !==
        hass.states[timetable.entity].attributes.timetable) {
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

  _content(hass) {
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
        row.appendChild(_getTimetable(state, name, hass));
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

function _indexToDate(index) {
  return new Date('1/1/00 ' + ~~(index / 2) + (index % 2 ? ':30' : ':00'));
}

function _timeToDate(time) {
  return new Date('1/1/00 ' + time);
}

function _dateToHour(date) {
  return date.toString().split(' ')[4];
}

function _isOn(entity, index) {
  const timetable = entity.attributes.timetable;
  if (!timetable.length) {
    return false;
  }
  const time = _indexToDate(index);
  let state = timetable[timetable.length - 1].state;
  let start = _indexToDate(0).getTime();
  for (const current of timetable) {
    const end = _timeToDate(current.time).getTime();
    if (time >= start && time < end) {
      break;
    }
    start = end;
    state = current.state;
  }
  return state === 'on';  
}

function _getTimetable(entity, name, hass) {
  const timetable = document.createElement('DIV');
  timetable.innerText = name + '    ' + entity.attributes.timetable.map(
    event => (event.state === 'on' ? '+' : '-') + event.time.slice(0, -3))
    .join('  ');
  const dialog = _createDialog(entity, name, hass);
  timetable.appendChild(dialog);
  timetable.dialog = dialog;
  timetable.onclick = function() {
    timetable.dialog.show();
  };
  timetable.style.cursor = 'pointer';
  return timetable;
}

function _setButtonColor(button, entity, index) {
  if (_isOn(entity, index)) {
    button.style.color = ON_TEXT;
    button.style.backgroundColor = ON_BACKGROUND;
  } else {
    button.style.color = OFF_TEXT;
    button.style.backgroundColor = OFF_BACKGROUND;
  }
}

function _createDialog(entity, name, hass) {
  const dialog = document.createElement('ha-dialog');
  dialog.heading = _dialogHeader(name, dialog, hass);
  dialog.open = false;
  dialog.addEventListener('closing', () => {
    _onClosingDialog(dialog, entity, hass);
  });
  const content = document.createElement('SPAN');
  dialog.content = content;
  dialog.appendChild(content);
  for (var i = 0; i < BUTTONS_COUNT; i++) {
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
  hass.callService('input_timetable', 'reset', {
    'entity_id': entity.entity_id,
  });
  let prev_on = false;
  let index = 0;
  for (const element of dialog.content.children) {
    if (element.nodeName !== 'BUTTON') {
      continue;
    }
    const on = element.style.backgroundColor === ON_BACKGROUND;
    if (index === 0 || prev_on !== on) {
      hass.callService('input_timetable', 'set', {
        'entity_id': entity.entity_id,
        'time': _dateToHour(_indexToDate(index)),
        'state': on ? 'on' : 'off',
      });
    }
    prev_on = on;
    index++;
  }
}

customElements.define('timetable-card', TimetableCard);
