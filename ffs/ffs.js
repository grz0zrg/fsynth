const fsynthcommon = require('../common')
const path = require('path')
const express = require('express')
const fastGlob = require('fast-glob')
const multer = require('multer')
const winston = require('winston')
const fse = require('fs-extra')
const cors = require('cors')
const { execSync } = require('child_process');
const zip = require('express-zip')

const logger = winston.createLogger({
        format: winston.format.combine(winston.format.splat(), winston.format.simple()),
        transports: [
            new (winston.transports.Console)({ 'timestamp': true, 'colorize': true })
        ]
    });

let default_path = "/usr/local/share/fragment/"
let fas_path = default_path

// args
const args = require('minimist')(process.argv.slice(2), {
    string: ["p"]
})

if ("h" in args) {
    console.log('Options : ')
    console.log('    -p "' + fas_path + '" - FAS resources path containing grains / impulses / waves folder')

    process.exit()
}

if ("p" in args) {
    fas_path = args.p;
} else {
    // try to detect FAS in working directory
    if (fse.existsSync('./fas') || fse.existsSync('./fas.exe')) {
        fas_path = process.platform === 'win32' ? process.cwd() : process.env.PWD

        logger.log('info', 'Fragment Audio Server found in working directory : %s', fas_path)
    }
}

if (!fse.pathExistsSync(fas_path)) {
    if (fas_path !== default_path) {
        logger.log("error", 'FAS path does not exist (add -h for help): %s', fas_path)
    } else {
        logger.log("error", 'Default FAS path does not exist (add -h for help): %s', fas_path)
    }

    process.exit()
} else {
    logger.log("info", 'FAS path : %s', fas_path)
}

const listAllFiles = dir => fastGlob.sync('**/*', {
    cwd: dir,
    absolute: true
})

const listAllDirs = dir => fastGlob.sync('**/*', {
    cwd: dir,
    absolute: true,
    onlyDirectories: true
})

const grains_dir = path.join(fas_path, "grains/")
const impulses_dir = path.join(fas_path, "impulses/")
const waves_dir = path.join(fas_path, "waves/")
const faust_generators_dir = path.join(fas_path, path.join("faust", "generators/"))
const faust_effects_dir = path.join(fas_path, path.join("faust", "effects/"))

// ensure upload directories exist
fse.ensureDirSync(grains_dir)
fse.ensureDirSync(impulses_dir)
fse.ensureDirSync(waves_dir)
fse.ensureDirSync(faust_generators_dir)
fse.ensureDirSync(faust_effects_dir)

const supported_filestype = [ // http://www.mega-nerd.com/libsndfile/
    '.wav', '.aiff', '.aif', '.aifc', '.flac', '.ogg', '.oga', '.au', '.snd', '.raw', '.gsm',
    '.vox', '.paf', '.fap', '.svx', '.nist', '.sph', '.voc', '.ircam', '.sf', '.w64', '.mat',
    '.mat4', '.mat5', '.pvf', '.xi', '.htk', '.sds', '.avr', '.wavex', '.sd2', '.caf', '.wve',
    '.prc', '.opus', '.mpc', '.rf64'
]

// multer
const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            let target = decodeURI(req.query.target)
            if (!target) {
                return cb(new Error('Missing target'))
            }

            let split_target = target.split('/')

            let dest_path = ''

            if (split_target[0] === 'grains') {
                dest_path = grains_dir
            } else if (split_target[0] === 'waves') {
                dest_path = waves_dir
            } else if (split_target[0] === 'impulses') {
                dest_path = impulses_dir
            } else if (split_target[0] === 'generators') {
                dest_path = faust_generators_dir
            } else if (split_target[0] === 'effects') {
                dest_path = faust_effects_dir
            } else {
                return cb(new Error('Unsupported target'))
            }

            split_target.shift()
            target = split_target.join('/')

            dest_path = path.join(dest_path, target)

            fse.ensureDirSync(dest_path)

            cb(null, dest_path)
        },
        filename: (req, file, cb) => {
            cb(null, file.originalname)
        }
    })
   
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        let target = decodeURI(req.query.target)
        let split_target = target.split('/')

        const ext_name = path.extname(file.originalname).toLowerCase()

        if (split_target[0] === 'grains' ||
            split_target[0] === 'waves' ||
            split_target[0] === 'impulses') {
            if (supported_filestype.indexOf(ext_name) === -1) {
                req.fileValidationError = 'Unsupported file format'
                return cb(new Error('Unsupported file format'), false)
            }
        } else if (split_target[0] === 'generators' ||
            split_target[0] === 'effects') {
            if (ext_name !== '.dsp') {
                req.fileValidationError = 'Unsupported file format'
                return cb(new Error('Unsupported file format'), false)
            }
        }
    
        cb(null, true)
    }
})

const app = express()

app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(cors())
 
app.post('/upload', upload.single('file'), (req, res, next) => {
        const file = req.file
        if (!file) {
            const error = new Error('Please upload a file')
            error.httpStatusCode = 400

            return next(error)
        }

        if (req.fileValidationError) {
            const error = new Error(req.fileValidationError)
            error.httpStatusCode = 400

            return next(error)
        }

        res.send(file)
    });

app.post('/uploads', upload.any('files'), (req, res, next) => {
    const files = req.files
    if (!files) {
        const error = new Error('Please choose files')
        error.httpStatusCode = 400
        
        return next(error)
    }

    if (req.fileValidationError) {
        return res.end(req.fileValidationError)
    }

    res.send(files)
})

app.get('/:target', (req, res, next) => {
    let target = req.params.target
    let target_path = target

    if (target === 'grains') {
        target_path = grains_dir
    } else if (target === 'waves') {
        target_path = waves_dir
    } else if (target === 'impulses') {
        target_path = impulses_dir
    } else if (target === 'generators') {
        target_path = faust_generators_dir
    } else if (target === 'effects') {
        target_path = faust_effects_dir
    } else {
        res.status(403).send(new Error('Unsupported target'))

        return;
    }

    try {
        const result_files = listAllFiles(target_path)
        const result_dirs = listAllDirs(target_path)

        const transformed_result = result_files.map((filepath) => {
            return filepath.replace(target_path, '')
        }).filter((filepath) => {
            const filename = path.basename(filepath)
            const ext_name = path.extname(filename).toLowerCase()

            let supported_ext = supported_filestype

            if (target === 'generators' ||
                target === 'effects') {
                supported_ext = ['.dsp']
            }

            return (supported_ext.indexOf(ext_name) !== -1)
        })

        const empty_dirs = []
        result_dirs.forEach((dir) => {
            const transformed_dir = dir.replace(target_path, '')

            let i = 0;
            for (i = 0; i < result_files.length; i += 1) {
                const filepath = result_files[i]

                if (filepath.indexOf(transformed_dir) !== -1) {
                    return
                }
            }

            empty_dirs.push(transformed_dir)
        })

        res.send({ files: transformed_result, empty_dirs: empty_dirs })
    } catch (e) {
        res.status(400).send(new Error('Unable to scan target directory'))
    }
})

app.put('/:target', (req, res, next) => {
    let target = req.params.target
    let target_path = target

    if (target === 'grains') {
        target_path = grains_dir
    } else if (target === 'waves') {
        target_path = waves_dir
    } else if (target === 'impulses') {
        target_path = impulses_dir
    } else if (target === 'generators') {
        target_path = faust_generators_dir
    } else if (target === 'effects') {
        target_path = faust_effects_dir
    } else {
        res.status(403).send(new Error('Unsupported target'))

        return;
    }

    let action = req.query.action;
    if (action === 'create') {
        req.body.forEach((filepath) => {
            const src = path.join(target_path, filepath)

            if (src) {
                fse.ensureDirSync(src)
            }
        })
    } else if (action === 'rename') {
        req.body.forEach((obj) => {
            const src = path.join(target_path, obj.src)
            const dst = path.join(target_path, obj.dst)

            if (obj.src && src !== dst) {
                fse.moveSync(src, dst)
            }
        })
    } else if (action === 'move') {
        req.body.forEach((obj) => {
            const src = path.join(target_path, obj.src)
            const dst = path.join(target_path, obj.dst)

            const filename = path.basename(obj.src)

            if (obj.src && src !== dst) {
                fse.moveSync(src, path.join(dst, filename), { overwrite: true })
            }
        })
    } else {
        res.status(400).send(new Error('Unknown action'))
    }

    res.status(200).send();
})

app.delete('/:target', (req, res, next) => {
    let target = req.params.target
    let target_path = target

    if (target === 'grains') {
        target_path = grains_dir
    } else if (target === 'waves') {
        target_path = waves_dir
    } else if (target === 'impulses') {
        target_path = impulses_dir
    } else if (target === 'generators') {
        target_path = faust_generators_dir
    } else if (target === 'effects') {
        target_path = faust_effects_dir
    } else {
        res.status(403).send(new Error('Unsupported target'))

        return;
    }

    req.body.forEach((filepath) => {
        if (filepath) {
            fse.removeSync(path.join(target_path, filepath))
        }
    })

    res.status(200).send();
})

app.post('/download/:target', (req, res, next) => {
    let target = req.params.target
    let target_path = target

    if (target === 'grains') {
        target_path = grains_dir
    } else if (target === 'waves') {
        target_path = waves_dir
    } else if (target === 'impulses') {
        target_path = impulses_dir
    } else if (target === 'generators') {
        target_path = faust_generators_dir
    } else if (target === 'effects') {
        target_path = faust_effects_dir
    } else {
        res.status(403).send(new Error('Unsupported target'))

        return;
    }

    const transformed_result = req.body.map((filepath) => {
        const filename = path.basename(filepath)

        const localpath = filepath.replace(target_path, '')
        const fullpath = path.join(target_path, (filepath !== target) ? localpath : filepath)

        return { path: fullpath, name: path.join(target, filepath) }
    })

    const files_to_send = []
    transformed_result.forEach((obj) => {
        try {
            const stat = fse.lstatSync(obj.path)
            if (stat.isDirectory()) {
                const files = listAllFiles(obj.path)
                files.forEach((filepath) => {
                    files_to_send.push({ path: filepath, name: path.join(target, filepath.replace(target_path, ''))});
                })
            } else if (stat.isFile()) {
                files_to_send.push(obj);
            }
        } catch (e) {
            logger.log('error', "%s", e)
        }
    })

    res.zip(files_to_send)
})

app.listen(fsynthcommon.ffs_port, () => {
    logger.log("info", 'Fragment - File Server listening on *:' + fsynthcommon.ffs_port)
});
