const fs = require('fs');
const path = require('path');
const https = require('https');

const MODELS = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
];

const BASE_URL =
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

const OUTPUT_DIR = path.join(__dirname, 'models', 'face');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function downloadFile(filename) {
  return new Promise((resolve, reject) => {
    const url = BASE_URL + filename;
    const dest = path.join(OUTPUT_DIR, filename);

    console.log(`⬇️  Downloading ${filename}...`);

    const file = fs.createWriteStream(dest);

    https
      .get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          https.get(response.headers.location, (res) => {
            res.pipe(file);
            file.on('finish', () => {
              file.close();
              console.log(`✅ ${filename}`);
              resolve();
            });
          });
        } else {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`✅ ${filename}`);
            resolve();
          });
        }
      })
      .on('error', (err) => {
        fs.unlink(dest, () => {});
        console.error(`❌ ${filename}: ${err.message}`);
        reject(err);
      });
  });
}

(async () => {
  console.log('📦 Downloading face-api models...\n');

  for (const model of MODELS) {
    try {
      await downloadFile(model);
    } catch (err) {
      console.error(`Failed: ${model}`);
    }
  }

  console.log('\n🎉 Done!');
  console.log(`📁 Models saved to: ${OUTPUT_DIR}`);
})();