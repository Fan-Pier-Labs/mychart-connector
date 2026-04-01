# openclaw-mychart

Access your Epic MyChart health records locally with [OpenClaw](https://openclaw.dev) — no server needed.

Provides 35+ tools covering medications, lab results, imaging, appointments, messages, billing, and more. All scraping runs on your machine; credentials never leave your device.

## Requirements

- [OpenClaw](https://openclaw.dev) installed
- Node.js 18+

## Installation

```sh
openclaw plugins install openclaw-mychart
```

## Setup

Run the interactive setup wizard to configure your MyChart credentials:

```sh
openclaw mychart setup
```

This walks you through:

1. Entering your MyChart hostname, username, and password (or importing from browser saved passwords)
2. Optionally configuring TOTP for automatic re-login when 2FA is required

## Available Tools

| Tool | Description |
|------|-------------|
| `mychart_get_profile` | Patient demographics (name, DOB, MRN, PCP) |
| `mychart_get_medications` | Current prescriptions and dosages |
| `mychart_get_lab_results` | Blood work and test results |
| `mychart_get_imaging_results` | X-ray, MRI, CT, ultrasound results |
| `mychart_get_upcoming_visits` | Scheduled appointments |
| `mychart_get_past_visits` | Visit history and notes |
| `mychart_get_health_issues` | Active diagnoses and conditions |
| `mychart_get_allergies` | Allergies and reactions |
| `mychart_get_vitals` | Blood pressure, weight, height, etc. |
| `mychart_get_messages` | Provider message conversations |
| `mychart_send_message` | Send a message to a provider |
| `mychart_get_care_team` | Care team members and contacts |
| `mychart_get_immunizations` | Vaccination history |
| `mychart_get_billing` | Billing statements and balances |
| `mychart_request_refill` | Request a prescription refill |
| ... | [35+ tools total](./skills/mychart/SKILL.md) |

## CLI Commands

```sh
openclaw mychart setup   # Configure credentials interactively
openclaw mychart status  # Show current configuration
openclaw mychart reset   # Clear saved credentials
```

## License

Source-available — personal and educational use permitted. See [LICENSE](./LICENSE) for full terms. Commercial use, redistribution, and SaaS offerings require written permission from Fan Pier Labs.
