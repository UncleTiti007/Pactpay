const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const allFiles = getAllFiles(path.join(__dirname, 'src'));
const keysInCode = new Set();

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // match t("key.something") or t('key.something')
  const regex = /t\([\'\"]([a-zA-Z0-9_\.]+)[\'\"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    keysInCode.add(match[1]);
  }
});

console.log('Total unique keys in code:', keysInCode.size);

const enPath = path.join(__dirname, 'src', 'locales', 'en.json');
const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));

function flatten(obj, prefix = '') {
  let res = {};
  for(let k in obj) {
    if(typeof obj[k] === 'object' && obj[k] !== null) {
      Object.assign(res, flatten(obj[k], prefix + k + '.'));
    } else {
      res[prefix + k] = obj[k];
    }
  }
  return res;
}

const enKeys = new Set(Object.keys(flatten(enJson)));
console.log('Total keys in en.json:', enKeys.size);

const missing = [];
for(let k of keysInCode) {
  if(!enKeys.has(k)) {
    missing.push(k);
  }
}

console.log('Missing keys in en.json:');
console.log(JSON.stringify(missing, null, 2));

