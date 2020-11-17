#!/usr/bin/env python3
import yaml

CONFIG_FILE = 'timers-config.yaml'
GENERATED_FILE = 'automations/timer-automations.yaml'
DOMAIN_CONFIG = {
  'switch': {
    'on_action': 'turn_on',
    'off_action': 'turn_off',
  },
  'cover': {
    'on_action': 'open_cover',
    'off_action': 'close_cover',
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
  line('- alias: %s'% config['name'])
  line('  trigger:')
  line('    - platform: state')
  line('      entity_id: %s, input_timetable.%s' % (
    config['switch'], config['timer']))
  line('  condition:')
  line('    - condition: state')
  line('      entity_id: %s' % config['switch'])
  line('      state: \'on\'')
  line('  action:')
  line('    - service: %s.{{ \'%s\' if is_state(\'input_timetable.%s\', '
    '\'on\') else \'%s\' }}' % (config['domain'], domain_config['on_action'],
    config['timer'], domain_config['off_action']))
  line('      entity_id:')
  for entity in config['entities']:
    line('        - %s.%s' % (config['domain'], entity))
  line('')

def line(content):
  out.write(content + '\n')

if __name__ == "__main__":
  with open(GENERATED_FILE, 'w') as out:
    main()