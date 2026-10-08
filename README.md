# Collective Blicca Referencelist

Aurora Reference List block: picked content items rendered like a listing, with per-variation templates and item templates

## Features

- Compatible with Plone 6.0+

## Installation

Add `collective.blicca.referencelist` to your project's dependencies:

```python
# In your pyproject.toml
dependencies = [
    "collective.blicca.referencelist",
    # ...
]
```

Then activate the addon in your Plone site's control panel or via GenericSetup.

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/collective/collective.blicca.referencelist.git
cd collective.blicca.referencelist

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install in development mode
pip install -e ".[test]"
```

### Running Tests

```bash
pytest
```

### Running Tests with Coverage

```bash
pytest --cov=collective.blicca.referencelist --cov-report=html
```

## License

GPL-2.0-or-later

## Author

Maik Derstappen <md@derico.de>
