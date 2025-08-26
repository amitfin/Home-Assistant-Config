#!/usr/bin/env python3
import yaml
import subprocess
import sys

try:
    import jinja2
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "jinja2"])
    import jinja2

CONFIG_FILE = "/config/timers/config.yaml"
GENERATED_FILE = "/config/timers/automations.yaml"
TEMPLATE_FILE = "template.jinja"

ACTION = {
    "switch": {
        "on": "switch.turn_on",
        "off": "switch.turn_off",
        "expected_on": '"on"',
        "expected_off": '"off"',
    },
    "light": {
        "on": "light.turn_on",
        "off": "light.turn_off",
        "expected_on": '"on"',
        "expected_off": '"off"',
    },
    "cover": {
        "on": "cover.open_cover",
        "off": "cover.close_cover",
        "expected_on": ["opening", "open"],
        "expected_off": ["closing", "closed"],
    },
    "climate": {
        "on": "climate.turn_on",
        "off": "climate.turn_off",
        "expected_on": ["cool", "heat"],
        "expected_off": '"off"',
    },
    "sensibo": {
        "on": "script.sensibo_cool_full_state",
        "off": "climate.turn_off",
    },
}


def base_rule_id(automation):
    return automation["control"][0].split(".")[1]


def add_ids(automations):
    base_rule_ids = [base_rule_id(automation) for automation in automations]
    for automation in automations:
        rule_id = base_rule_id(automation)
        if base_rule_ids.count(rule_id) > 1:
            rule_id += "_" + automation["action"]
        automation["id"] = rule_id


def main():
    with open(CONFIG_FILE, "r") as config_file:
        automations = yaml.safe_load(config_file)
    add_ids(automations)

    env = jinja2.Environment(
        loader=jinja2.FileSystemLoader("/config/timers"),
        trim_blocks=True,
        lstrip_blocks=True,
    )
    template = env.get_template(TEMPLATE_FILE)
    rendered = template.render(automations=automations, action=ACTION)

    with open(GENERATED_FILE, "w") as f:
        f.write(rendered)


if __name__ == "__main__":
    main()
