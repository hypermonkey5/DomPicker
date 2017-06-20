const electron = require('electron');
const url = require('url');
const path = require('path');

const {app, ipcMain} = electron;
const MickrClient = require('../modules/MickrClient.js');
const MickrWindow = require('../modules/MickrWindow.js');
const ClipboardHandler = require('../modules/ClipboardHandler.js');
const WindowAnimator = require('../modules/WindowAnimator.js')

const wManager = new MickrWindow()
const wAnimator = new WindowAnimator()

let mainWindow = null;

let d = null;


// let client = new MickrClient({
//   "id": "clip",
//   "url": "ws://apps.wisdomweb.net:64260/ws/mik",
//   "site": "ashun",
//   "token": "Pad:7732"
// })

var x = 0;
var y = 0;

/* アプリケーションが起動した時の処理 */
app.on('ready', () => {
  d = electron.screen.getPrimaryDisplay()
  mainWindow = wManager.buildWindow({
    page: 'example/clip.html',
    x: d.workAreaSize.width - 150,
    y: 0,
    width: 150,
    height: 150,
    transparent: true,
    ignoreMouseEvent: false,
    AlwaysOnTop: true
  });

  mainWindow.focus()

  wAnimator.setWindow(mainWindow);
  wAnimator.initAnimation()
  wAnimator.addGoAround()

  ClipboardHandler.on('update', (data) => {
    if(mainWindow){
      console.log(data);
      mainWindow.webContents.send('clip', data)
    }
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
  mainWindow = wManager.buildWindow({
    page: 'example/clip.html',
    x: d.workAreaSize.width - 150,
    y: d.workAreaSize.height - 100,
    width: 150,
    height: 100,
    transparent: true,
    ignoreMouseEvent: false,
    AlwaysOnTop: true
  });
});
