#!/usr/bin/env python3
import yaml

CONFIG_FILE = '/config/timers/config.yaml'
GENERATED_FILE = '/config/automations/timer-automations.yaml'
SERVICE = {
  'switch': {
    'on': 'switch.turn_on',
    'off': 'switch.turn_off',
  },
  'light': {
    'on': 'light.turn_on',
    'off': 'light.turn_off',
  },
  'cover': {
    'on': 'cover.open_cover',
    'off': 'cover.close_cover',
  },
  'climate': {
    'on': 'climate.turn_on',
    'off': 'climate.turn_off',
  },
}
EXPECTED_STATE = {
  'switch': {
    'on': '"on"',
    'off': '"off"',
  },
  'light': {
    'on': '"on"',
    'off': '"off"',
  },
  'cover': {
    'on': ['opening', 'open'],
    'off': ['closing', 'closed'],
  },
  'climate': {
    'on': ['cool', 'heat'],
    'off': '"off"',
  },
}

class GenerateRules():
  def __init__(self) -> None:
    with open(CONFIG_FILE, 'r') as config_file:
      self._config = yaml.load(config_file, Loader=yaml.SafeLoader)
    self._output = open(GENERATED_FILE, 'w')
    self._write('# GENERATED FILE - DO NOT EDIT MANUALLY\n')

  def __del__(self) -> None:
    if self._output:
      self._output.close()

  def __enter__(self):
    return self

  def __exit__(self, *args):
    self._output.close()
    self._output = None

  def _write(self, line: str):
    self._output.write(line + '\n')

  def process(self):
    for entry in self._config:
      self._create_rule(entry)

  def _create_rule(self, config: dict[str, any]):
    name = config['control'][0].split('.')[1]
    if not self._unique(config['control'][0]):
      name += '_' + config['domain']
    self._write('- id: %s'% name)
    self._write('  alias: %s'% name.replace("_", " ").title() + " (Generated)")
    self._write('  mode: restart')
    self._write('  triggers:')
    self._write('    - trigger: state')
    self._write('      entity_id:')
    for state in config['control']:
      self._write('        - %s' % state)
    if 'condition' in config:
      self._write('        - %s' % config['condition'])
    self._write('      to: ["on", "off"]')
    self._write('  actions:')
    if 'condition' in config:
      self._write('    - condition: template')
      self._write('      value_template: "{{ is_state(\'%s\', \'on\') }}"' % config['condition'])
    self._write('    - if:')
    self._write('        - condition: template')
    self._write('          value_template: "{{ %s }}"' % (
      ' and '.join(map(lambda state: "is_state('%s', 'on')" % state, config['control']))))
    for state in ['on', 'off']:
      self._write('      %s:' % ('then' if state == 'on' else 'else'))
      self._write('        - action: retry.action')
      self._write('          data:')
      self._write('            action: %s' % SERVICE[config['domain']][state])
      self._write('            entity_id:')
      for entity in config['entities']:
        self._write('              - %s' % entity)
      if config['domain'] in EXPECTED_STATE:
        self._write('            expected_state: %s' % EXPECTED_STATE[config['domain']][state])
    self._write('')

  def _unique(self, state: str) -> bool:
    return list(map(lambda x: x['control'][0], self._config)).count(state) == 1

if __name__ == "__main__":
  with GenerateRules() as engine:
    engine.process()
