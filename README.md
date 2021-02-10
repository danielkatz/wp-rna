# WP-RNA

## Usage

Getting Started
```sh
git clone git@github.com:danielkatz/wp-rna.git
cd wp-rna
./bin/run --help
```

Create manifest
```sh
./bin/run manifest --path <path_to_wp> > manifest.yaml
```

Scaffold clean wordpress
```sh
./bin/run scaffold -f manifest.yaml --dest <path_to_wp>
```

## Roadmap

- [x] Create manifest
- [x] Scaffold clean wordpress
- [ ] Publish as package
- [ ] Fingerprint components
- [ ] Fast scan for components with changed fingerprint
