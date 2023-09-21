# protopie-watcher

This small script can be used to upload changed ProtoPie files (pies) to ProtoPie Connect.

## Installation

`npm install -g protopie-watcher`

## Usage

Navigate to a folder with pies and execute `protopie-watcher`. It will ask to create a new configuration file for localhost and ask if it should scan for pies. Check the configuration file and add the pieid's from ProtoPie Connect. If they have not been uploaded yet start again with `protopie-watcher --upload-on-start`, else start with `protopie-watcher`.

```
Usage: protopie-watcher [options]

Watch ProtoPie Files for changes and upload to ProtoPie Connect

Options:
  -V, --version              output the version number
  -c, --config <file>        config file to use (default: "./protopie-watcher.json")
  -d, --debounce <debounce>  (in ms) how long do we wait until a change gets uploaded again? (default: 2000)
  -u, --upload-on-start      upload all pies when starting
  -h, --help                 display help for command
```
