# Fragment Audio Server file manager

This is a file manager for the audio server which can be used by a frontend app to query / do actions on files used by the audio server.

This is used by the fsynth client to display FAS files in a convenient way and allow upload / actions on files.

By default this listen on port 3122 and use FAS install path `/usr/local/share/fragment/`

Args :
* `-p "/usr/local/share/fragment"` define FAS resources path

Routes :
* POST `/upload` upload a file
* POST `/uploads` upload multiple files
* GET `/:target` { files: ..., empty_dirs: ... } retrieve all files and empty directories from target directory, target must be one of these values : `grains` `waves` `impulses` `generators` `effects`
* DELETE `/:target` delete files received as an array of filepath (without target), target must be one of these values : `grains` `waves` `impulses` `generators` `effects`

All POST actions must have a `target` URL query string which indicate the target directory of the uploaded files, the target value must at least start from these values : `grains` `waves` `impulses` `generators` `effects`