// db maintenance tool to remove sessions data with default example
const MongoClient = require('mongodb').MongoClient
const ObjectId = require('mongodb').ObjectId

const client = new MongoClient()

client.connect('mongodb://localhost:27017/fs').then(async (db) => {
  const collections = await db.listCollections().toArray()
  const collection_names = collections.map(c => c.name)

  let delete_count = 0

  for (let i = 0; i < collection_names.length; i += 1) {
    const collection_name = collection_names[i]
    if (collection_name[0] === '_') {
      const data = await db.collection(collection_name).find().sort({_o: -1}).toArray()

      if (!data[0]) {
        console.log('deleting', collection_name + ' (no data)')

        await db.collection(collection_name).drop()
      } else {
        const timestamp = ObjectId(data[0]._o).getTimestamp()
        const year = (new Date(timestamp)).getFullYear()

        if (year >= 2015 && year <= 2021) {
/*
          // aggregate number of versions
          const version = data.reduce((pv, cv) => {
            return pv + cv._v
          }, 0)
*/

          const should_delete = data.every((d) => { if (d._id === 'code_main' || d._id === 'fs') {
            if (d._data === '\n  // Sample program : ~440Hz tone + MIDI keyboard additive synthesis SAW-like setup.\n  // Full documentation : https://www.fsynth.com/documentation\n\n  void main () {\n    float l = 0., r = 0.;\n    \n    vec2 uv = gl_FragCoord.xy / resolution;\n\n    float attenuation_constant = 1.95;\n\n    const float harmonics = 8.;\n\n    for (int k = 0; k < 16; k += 2) {\n      vec4 data = keyboard[k];\n\n      float kfrq = data.x; // frequency\n      float kvel = data.y; // velocity\n      float ktim = data.z; // elapsed time\n      float kchn = data.w; // channel\n\n      if (kfrq == 0.) {\n       \tbreak;\n      }\n\n      for (float i = 1.; i < harmonics; i += 1.) {\n        float a = 1. / pow(i, attenuation_constant);\n\n        l += fline(kfrq * i) * a * kvel;\n        r += fline(kfrq * i) * a * kvel;\n      }\n    }\n\n    l += fline(440.) * 0.25;\n    r += fline(440.) * 0.25;\n\n    synthOutput = vec4(l, r, 0., 0.); // WebGL 2 only (gl_FragColor otherwise)\n    gl_FragColor = vec4(l, r, 0., 1.);\n  }') return true; else return false; } else return true
          })

          if (should_delete) {
            console.log('deleting', collection_name, timestamp)

            await db.collection(collection_name).drop()
            await db.collection('o_'+collection_name).drop()
            
            delete_count += 1
          }
        }
      }
    } else if (collection_name[0] === 'o') {
/*
      const data = await db.collection(collection_name).find().sort({_id: -1}).toArray()

      if (!data[0]) {
        console.log('deleting', collection_name + ' (no data)')
        
        await db.collection(collection_name).drop()
      } else {
        const timestamp = ObjectId(data[0]._id).getTimestamp()
        const year = (new Date(timestamp)).getFullYear()

        if (year === 2017 || year === 2018 || year === 2019 || year === 2020 || year === 2021) {
          if (data.length <= 1) {
            delete_count += 1

            console.log('deleting', collection_name, timestamp)

            await db.collection(collection_name).drop()
          }
        }
      }
*/
    } else {
      console.log('skipping ' + collection_name)
    }
  }

  console.log(delete_count + ' collections deleted')

  const remaining_collections = await db.listCollections().toArray()

  console.log('remaining: ' + remaining_collections.length)

  db.close()
}).catch((err) => {
  console.log(err)
})

