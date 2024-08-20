import fs from 'fs';
import { google } from 'googleapis';
import readline from 'readline';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  authorize(JSON.parse(content), listFiles);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the given callback function.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile('token.json', (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then execute the given callback with the authorized OAuth2 client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.metadata.readonly'],
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile('token.json', JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', 'token.json');
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Recursively list files and folders from Google Drive and build a JSON structure.
 */
function listFiles(auth) {
  const drive = google.drive({ version: 'v3', auth });

  function getFiles(parentId) {
    return new Promise((resolve, reject) => {
      drive.files.list({
        q: `'${parentId}' in parents and trashed=false`,
        fields: 'nextPageToken, files(id, name, mimeType)',
      }, (err, res) => {
        if (err) return reject('The API returned an error: ' + err);
        resolve(res.data.files);
      });
    });
  }

  async function buildTree(folderId, tree) {
    const files = await getFiles(folderId);
    for (let file of files) {
      tree[file.name] = { id: file.id };
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        tree[file.name].children = {};
        await buildTree(file.id, tree[file.name].children);
      }
    }
  }

  const rootFolderId = '14XgRKhd6fb6pCl1rAXCttUTOxBvma4os';
  let driveTree = { };

  buildTree(rootFolderId, driveTree)
    .then(() => {
      fs.writeFileSync('drive_structure2.json', JSON.stringify(driveTree, null, 2));
      console.log('Drive structure saved to drive_structure.json');
    })
    .catch((error) => console.error(error));
}
