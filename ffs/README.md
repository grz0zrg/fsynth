# Fragment Audio Server file manager

This is a lightweight file manager for the audio server which can be used by a frontend app to query / do actions on files used by the audio server.

This is used by the fsynth client to display FAS files in a convenient way and allow upload / actions on files.

By default this listen on port 3122 and if FAS resources path is not specified look into current working directory, detect `fas` or `fas.exe` and if successful set this as resources path (so it can be bundled with the audio server)

It will look into default FAS install path `/usr/local/share/fragment/` if it fail to detect binaries (and -p is not used)

Args :
* `-p "/usr/local/share/fragment"` define FAS resources path

Routes :
* POST `/upload` upload a file
* POST `/uploads` upload multiple files
* POST `/download/:target` send files (or complete directories) received as an array of filepath as a .zip file
* PUT `/:target?action=create|move|rename`
 * `create` directories from an array of filepath : `grains` `waves` `impulses` `generators` `effects`
 * `move` or `rename` files from an array of objects of the following definition : { src: String, dst: String } target must be one of these values : `grains` `waves` `impulses` `generators` `effects`
* GET `/:target` { files: [String, ...], empty_dirs: [String, ...] } retrieve all files and empty directories from target directory, target must be one of these values : `grains` `waves` `impulses` `generators` `effects`
* DELETE `/:target` delete files received as an array of filepath (without target), target must be one of these values : `grains` `waves` `impulses` `generators` `effects`

All POST actions must have a `target` URL query string which indicate the target directory of the uploaded files, the target value must at least start from these values : `grains` `waves` `impulses` `generators` `effects`

## Packaging

For convenience FFS is packaged as a binary for linux / windows platforms on the fsynth website, this was done with [pkg](https://github.com/vercel/pkg) tool with the following options :

`pkg -t node12-linux,node12-win ffs.js`
