const electron = require('electron');
const url = require('url')
const path = require('path');

/*
  app: NodeJS上で動くMainプロセス
  ipcMain: MainプロセスとRendererプロセスのモジュール間通信を行う
  Tray: macOS上のメニューバー上のアイコン
  Menu: メニュー画面
  globalShortcut: キーボードのショートカット設定
  screen: windowオブジェクトの設定
  BrowserWindow: electronで起動するwindow上におけるwindowオブジェクト
*/
const {app, ipcMain, Tray, Menu, globalShortcut, powerSaveBlocker} = electron;
const MickrClient = require('./modules/MickrClient.js')
const MickrWindow = require('./modules/MickrWindow.js')
const SetMickrClientWindow = require('./modules/SetMickrClientWindow.js')
// const MouseWatcher = require('./modules/MouseWatcher.js')

let tray = null;
let tray2 = null;
let client = null;

const wm = new MickrWindow()
// const watcher = new MouseWatcher()

/* アプリケーションが起動した時の処理 */
app.on('ready', () => {
  SetMickrClientWindow.create()
  ipcMain.on('set_clinet', (e, data) => {
    client = new MickrClient(data)
    console.log(client);
    client.on('mickr', (req, res) => {wm.getAllMainWindows().forEach(w => {
      w.send('mickr', req.body.content);
      console.log('mickr', req.body.content);
    })})
    SetMickrClientWindow.close()
  })
  wm.activateMainWindows();

  ipcMain.on('mouse', ()=>{wm.switchShowMode()})
  setInterval(() => {wm.watchMousePoint()}, 80)
});

/* 全てのウィンドウが閉じられた場合の処理 */
app.on('window-all-closed', () => {
  if(process.platform !== 'darwin'){
    windowManager.quit()
    app.quit();
  }
});

/* Mainプロセス起動時の処理 */
app.on('activate', () => {
  wm.activateMainWindows();
});
