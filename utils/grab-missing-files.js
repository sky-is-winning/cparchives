import CryptoJS from 'crypto-js';
import fs from 'fs';
import http from 'http';

const missingFilesPath = './missing_files.txt';
const missingFiles = fs.readFileSync(missingFilesPath, 'utf8').split('\n').map(file => file.trim()).filter(file => file);
const missingFilesURLs = missingFiles.map(file => getFileURL(file));

missingFilesURLs.forEach((url, index) => {
    const dest = `./temp${url}`;
    downloadFile(url, dest);
});

function getFileURL(file) {
    const fileArr = file.split("=");
    const fileName = fileArr[fileArr.length - 1];
    const md5hash = CryptoJS.MD5(fileName).toString();
    return `/static/images/archives/${md5hash[0]}/${md5hash[0]}${md5hash[1]}/${fileName}`
}

function downloadFile(url, dest) {
    let destArr = dest.split('/');
    destArr.pop();
    const dir = destArr.join('/');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    const file = fs.createWriteStream(dest);
    const request = http.get(`http://archives.clubpenguinwiki.info${url}`, function (response) {
        response.pipe(file);
    });
}