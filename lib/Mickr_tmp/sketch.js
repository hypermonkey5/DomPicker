const electron = require('electron');
const url = require('url');
const path = require('path');
const autodraw = require('autodraw')
const request = require('request');

const {app, ipcMain, BrowserWindow } = electron;

var nodeStatic = require('node-static');
var file = new nodeStatic.Server(__dirname + '/public');
require('http').createServer(function (request, response) {
    request.addListener('end', function () {
        file.serve(request, response);
    }).resume();
}).listen(7170);

var x = 0;
var y = 0;
var mainWindow = null;
var shapes = []

/* アプリケーションが起動した時の処理 */
app.on('ready', () => {
  mainWindow = new BrowserWindow({
      x: 0,
      y: 0,
      width: electron.screen.getPrimaryDisplay().workAreaSize.width,
      height: electron.screen.getPrimaryDisplay().workAreaSize.height,
      webaudio: true,
      // webPreferences: {
      //   nodeIntegration: false
      // }
  });

  // mainWindow.loadURL("http://localhost:7000/post.html");
  mainWindow.loadURL(url.format({
      pathname: path.join(__dirname, 'public/web/post.html'),
      protocol: 'file:',
      slashes: true
  }));

  ipcMain.on('record', (e,data) => {
    console.log(data);
    shapes.push(data.shape)
    autodraw(shapes).then(results => {
      console.log(results);
      mainWindow.webContents.send('autodraw', {results: results})
      /* array of recognized objects:
       * [{
       *    name,
       *    confidence (closer to 0 == more confident),
       *    url (url to a svg representing the object),
       *    url_variant_1,
       *    url_variant_2
       * }]
       */
    })

  })
});

/* 全てのウィンドウが閉じられた場合の処理 */
app.on('window-all-closed', () => {
  if(process.platform !== 'darwin'){
    app.quit();
  }
});

/* Mainプロセス起動時の処理 */
app.on('activate', () => {
  mainWindow = null;
});
//
