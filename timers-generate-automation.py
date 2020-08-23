#!/usr/bin/env python3
import yaml

CONFIG_FILE = 'timers-config.yaml'
GENERATED_FILE = 'automations/timer-automations.yaml'
DOMAIN_CONFIG = {
  'switch': {
    'on': 'on',
    'off': 'off',
    'on_action': 'turn_on',
    'off_action': 'turn_off',
  },
  'cover': {
    'on': 'open',
    'off': 'closed',
    'on_action': 'open_cover',
    'off_action': 'close_cover',
  },
}

def main():
  line('# GENERATED FILE - DO NOT EDIT MANUALLY\n')
  with open(CONFIG_FILE, 'r') as config_file:
    config = yaml.load(config_file, Loader=yaml.SafeLoader)
  for rule in config:
    create(rule, True)
    create(rule, False)
    line('')

def create(config, on):
  domain_config = DOMAIN_CONFIG[config['domain']]
  name = config['name'] + ('_on' if on else '_off')
  line('- id: %s' % name)
  line('  alias: %s'% name)
  line('  trigger:')
  line('    - platform: time_pattern')
  line('      minutes: 0')
  line('    - platform: state')
  line('      entity_id: %s' % config['switch'])
  line('      to: \'on\'')
  line('  condition:')
  line('    - condition: state')
  line('      entity_id: %s' % config['switch'])
  line('      state: \'on\'')
  line('    - condition: template')
  line(('      value_template: "{{ states(\'input_number.%s\') | int | '
    'bitwise_and(2 ** now().hour) %s 0}}"')
    % (config['timer'], '>' if on else '=='))
  line('  action:')
  line('    - service: %s.%s' % (config['domain'],
    domain_config['on_action'] if on else domain_config['off_action']))
  line('      entity_id:')
  for entity in config['entities']:
    line('        - %s.%s' % (config['domain'], entity))
  
def line(content):
  out.write(content + '\n')

if __name__ == "__main__":
  with open(GENERATED_FILE, 'w') as out:
    main()