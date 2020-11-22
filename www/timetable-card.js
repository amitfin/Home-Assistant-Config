const mdiClose =
  "M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z";
const mdiPlus = "M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z";
const mdiTrash =
  "M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12z";

class TimetableCard extends HTMLElement {
  set hass(hass) {
    if (!this.config) {
      return;
    }

    if (!this.card) {
      this.card = document.createElement("ha-card");
      this.card.header = this._header(hass);
      this.card.appendChild(this.card.header);
      this.card.content = this._content(hass);
      this.card.appendChild(this.card.content);
      this.appendChild(this.card);
    } else {
      this._updateHeader(hass);
      this._updateContent(hass);
    }
  }

  setConfig(config) {
    for (const property of ["title", "toggle", "entities"]) {
      if (!config[property]) {
        throw new Error("You need to define " + property);
      }
    }
    for (const timetable of config.entities) {
      if (!timetable.entity) {
        throw new Error("You need to define entity");
      }
    }
    this.config = config;
    if (this.card) {
      this.removeChild(this.card);
      delete this.card;
    }
  }

  getCardSize() {
    return this.config.entities.length;
  }

  _header(hass) {
    const header = document.createElement("DIV");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    const title = document.createElement("DIV");
    title.classList.add("name");
    title.innerText = this.config.title;
    header.appendChild(title);
    const toggle = document.createElement("ha-switch");
    toggle.style.padding = "13px 5px";
    if (hass.states[this.config.toggle]) {
      toggle.checked = hass.states[this.config.toggle].state === "on";
      toggle.addEventListener("change", () => {
        hass.callService("input_boolean", "toggle", {
          entity_id: this.config.toggle,
        });
      });
    } else {
      toggle.disabled = true;
    }

    header.toggle = toggle;
    header.appendChild(toggle);
    return header;
  }

  _updateHeader(hass) {
    if (hass.states[this.config.toggle]) {
      const is_on = hass.states[this.config.toggle].state === "on";
      if (this.card.header.toggle.checked !== is_on) {
        this.card.header.toggle.checked = is_on;
      }
    }
  }

  _content(hass) {
    const content = document.createElement("DIV");
    content.style.padding = "0px 16px";
    content.rows = [];
    for (const entity of this.config.entities) {
      const row = document.createElement("DIV");
      row.entity = entity.entity;
      row.classList.add("card-content");
      row.style.padding = "0px 0px 8px";
      const state = hass.states[entity.entity];
      if (state) {
        const name =
          entity.name || state.attributes.friendly_name || state.entity_id;
        const timetable = _getTimetable(state, name, hass);
        row.timetable = timetable;
        row.appendChild(timetable);
      } else {
        row.innerText = "Entity not found: " + entity.entity;
      }
      content.rows.push(row);
      content.appendChild(row);
    }
    return content;
  }

  _updateContent(hass) {
    for (const row of this.card.content.rows) {
      const state = hass.states[row.entity];
      if (state) {
        _updateSummary(row.timetable, state);
      }
      const dialog = row.timetable.dialog;
      const old_timetable = [...dialog.timetable];
      old_timetable.sort((x, y) => (x.time < y.time ? -1 : 1));
      const new_timetable = state.attributes.timetable;
      if (JSON.stringify(old_timetable) !== JSON.stringify(new_timetable)) {
        dialog.timetable = [...new_timetable];
        _createDialogRows(dialog);
      }
    }
  }
}

function _getTimetable(entity, name, hass) {
  const timetable = document.createElement("DIV");
  timetable.style.display = "flex";
  timetable.style.justifyContent = "space-between";
  const title = document.createElement("P");
  title.innerText = name;
  timetable.appendChild(title);
  const summary = document.createElement("P");
  summary.style.marginLeft = "auto";
  timetable.summary = summary;
  _updateSummary(timetable, entity);
  timetable.appendChild(summary);
  const dialog = _createDialog(entity, name, hass);
  timetable.appendChild(dialog);
  timetable.dialog = dialog;
  summary.onclick = function () {
    dialog.show();
  };
  title.onclick = summary.onclick;
  timetable.style.cursor = "pointer";
  return timetable;
}

function _updateSummary(timetable, entity) {
  let text = entity.attributes.timetable
    .map(
      (event) => (event.state === "on" ? "+" : "-") + event.time.slice(0, -3)
    )
    .join("  ");
  if (!text.length) {
    text = "<empty>";
  }
  if (timetable.summary.innerText !== text) {
    timetable.summary.innerText = text;
  }
}

function _createDialog(entity, name, hass) {
  const dialog = document.createElement("ha-dialog");
  dialog.entity_id = entity.entity_id;
  dialog.hass = hass;
  dialog.heading = _dialogHeader(name, dialog);
  dialog.open = false;

  dialog.timetable = [...entity.attributes.timetable];

  const plus = document.createElement("DIV");
  plus.style.display = "flex";
  plus.style.justifyContent = "center";
  plus.onclick = function () {
    dialog.timetable.push({ time: "00:00:00", state: "on" });
    _createDialogRows(dialog);
    _reconfig(dialog);
  };
  const button = document.createElement("mwc-icon-button");
  plus.appendChild(button);
  const icon = document.createElement("ha-svg-icon");
  icon.path = mdiPlus;
  button.appendChild(icon);
  const text = document.createElement("P");
  text.innerText = "Add entry";
  plus.appendChild(text);
  dialog.plus = plus;

  _createDialogRows(dialog);

  return dialog;
}

function _createDialogRows(dialog) {
  dialog.innerHTML = "";
  dialog.timetable.forEach((event, index) => {
    dialog.appendChild(_row(event, index, dialog));
  });
  dialog.appendChild(dialog.plus);
}

function _dialogHeader(name, dialog) {
  const header = document.createElement("DIV");
  header.style.display = "flex";
  const button = document.createElement("mwc-icon-button");
  button.style.marginLeft = "-18px";
  button.onclick = function () {
    dialog.close();
  };
  header.appendChild(button);
  const icon = document.createElement("ha-svg-icon");
  icon.path = mdiClose;
  button.appendChild(icon);
  const title = document.createElement("DIV");
  title.style.margin = "10px 0px 0px 15px";
  title.innerText = name;
  header.appendChild(title);
  return header;
}

function _row(event, index, dialog) {
  const row = document.createElement("DIV");
  row.style.display = "flex";
  row.style.justifyContent = "space-around";

  const time = event.time.split(":");
  const time_input = document.createElement("INPUT");
  time_input.setAttribute("type", "time");
  time_input.value = time[0] + ":" + time[1];
  time_input.onblur = function () {
    const time = time_input.value + ":00";
    if (event.time !== time) {
      event.time = time;
      _reconfig(dialog);
    }
  };
  row.appendChild(time_input);

  const toggle = document.createElement("ha-switch");
  toggle.style.paddingLeft = "24px";
  toggle.style.paddingRight = "24px";
  toggle.style.paddingTop = "15px";
  toggle.checked = event.state === "on";
  toggle.addEventListener("change", () => {
    event.state = toggle.checked ? "on" : "off";
    _reconfig(dialog);
  });
  row.appendChild(toggle);

  const button = document.createElement("mwc-icon-button");
  button.style.marginTop = "-3px";
  button.onclick = function () {
    dialog.timetable = dialog.timetable.filter((_, i) => i !== index);
    _createDialogRows(dialog);
    _reconfig(dialog);
  };
  row.appendChild(button);
  const icon = document.createElement("ha-svg-icon");
  icon.path = mdiTrash;
  button.appendChild(icon);

  return row;
}

function _reconfig(dialog) {
  dialog.hass.callService("input_timetable", "reconfig", {
    entity_id: dialog.entity_id,
    timetable: dialog.timetable,
  });
}

customElements.define("timetable-card", TimetableCard);
