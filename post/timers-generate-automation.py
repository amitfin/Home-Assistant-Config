#!/usr/bin/env python3
import yaml

CONFIG_FILE = 'timers-config.yaml'
GENERATED_FILE = 'automations/timer-automations.yaml'
DOMAIN_CONFIG = {
  'switch': {
    'on': 'turn_on',
    'off': 'turn_off',
  },
  'light': {
    'on': 'turn_on',
    'off': 'turn_off',
  },
  'cover': {
    'on': 'open_cover',
    'off': 'close_cover',
  },
  'climate': {
    'on': 'turn_on',
    'off': 'turn_off',
  },
}

def main():
  line('# GENERATED FILE - DO NOT EDIT MANUALLY\n')
  with open(CONFIG_FILE, 'r') as config_file:
    config = yaml.load(config_file, Loader=yaml.SafeLoader)
  for rule in config:
    create(rule)

def create(config):
  domain_config = DOMAIN_CONFIG[config['domain']]
  line('- id: %s'% config['timer'])
  line('  alias: %s'% config['timer'])
  line('  trigger:')
  line('    - platform: state')
  line('      entity_id: %s, input_timetable.%s' % (
    config['switch'], config['timer']))
  line('  condition: "{{ is_state(\'%s\', \'on\') }}"' % config['switch'])
  line('  action:')
  line('    - service: %s.{{ iif(is_state(\'input_timetable.%s\', '
    '\'on\'), \'%s\', \'%s\') }}' % (config['domain'], config['timer'],
    domain_config['on'], domain_config['off']))
  line('      entity_id: %s' % ', '.join(map(
    lambda entity: '%s.%s' % (config['domain'], entity), config['entities'])))
  line('')

def line(content):
  out.write(content + '\n')

if __name__ == "__main__":
  with open(GENERATED_FILE, 'w') as out:
    main()
