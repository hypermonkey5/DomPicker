const url = require('url');
const path = require('path');
const electron = require('electron')
const EventEmitter = new require('events').EventEmitter;
const {ipcMain, BrowserWindow } = electron;
// const GoogleDriveAPI = require('./DriveAPI/app.js')


class MickrWindow extends EventEmitter{
  constructor(ipcMain){
    super()
    this.mainWindows = {}
    this.subWindow = null;
    this.show_mode = true;
    this.transparent_mode = true;
    this.pause = false;
    this.page = 'land.html';
  }

  setPageURL(url){
    this.page = url || 'land.html';
  }
  /* 透明ウィンドウの生成 */
  activateMainWindows(){
    var mainWindow = this.getMainWindow();
    this.createMainWindows()
    ipcMain.on('ack', (e ,data) => {console.log(e, data);})
    electron.screen.on('display-added', (e, d) => this.buildMainWindow(d))
    electron.screen.on('display-removed', (e, d) => {this.removeWindow(d)})
    ipcMain.on('collision',(e, d)=>{
      var w = this.getWindowWithDisplay(electron.screen.getDisplayNearestPoint(electron.screen.getCursorScreenPoint()));
      if(d.transparent_mode){
        this.transparent_mode = true
        w.setIgnoreMouseEvents(true);
        w.setFocusable(false);
        w.webContents.send('switch_mode', true);
      }
      else{
        this.transparent_mode = false;
        w.setIgnoreMouseEvents(false);
        w.setFocusable(true);
        w.focus();
        w.focusOnWebView();
        w.webContents.send('switch_mode', false);
      }
    });
    if(mainWindow === null || mainWindow === undefined){this.createMainWindows()}
  }

  quit(){
    this.getAllMainWindows.forEach(w=>{w.close()})
    this.mainWindows = {}
  }

  getWindowWithDisplay(d){
    var w = this.mainWindows[d.id];
    return (w !== undefined || w !== null) ? w : this.buildMainWindow();
   }

  createMainWindows(){return electron.screen.getAllDisplays().map(d=>this.buildMainWindow(d))}

  buildMainWindow(d){
    var w = this.mainWindows[d.id];
    if(w === null || w === undefined){
      this.mainWindows[d.id] = this.buildWindow({display: d});
      return w;
    }
    else{
      return w;
    }
  }

  buildWindow(option){
    option.display = option.display || electron.screen.getPrimaryDisplay();
    option.page = option.page || this.page;
    option.x = option.display.bounds.x + (option.x === undefined ? 0 : option.x);
    option.y = option.display.bounds.y + (option.y === undefined ? 0 : option.y);
    option.width = option.width || option.display.workAreaSize.width;
    option.height = option.height || option.display.workAreaSize.height;
    option.transparent = option.transparent === undefined ? true : option.transparent;
    option.ignoreMouseEvent = option.ignoreMouseEvent === undefined ? true : option.ignoreMouseEvent;
    option.AlwaysOnTop = option.AlwaysOnTop === undefined ? true : option.AlwaysOnTop;

    var w = new BrowserWindow({
        x: option.x,
        y: option.y,
        width: option.width,
        height: option.height,
        transparent: option.transparent,
        frame: false,
        // type: "desktop",
        hasShadow: false
    });

    w.loadURL(url.format({
        pathname: path.join(__dirname, '..', 'public', option.page),
        protocol: 'file:',
        slashes: true
    }));
    if(option.ignoreMouseEvent){
      w.setIgnoreMouseEvents(true)
      // w.setFocusable(false);
    }
    if(option.AlwaysOnTop){
      w.setAlwaysOnTop(true, 'floating');
      w.setVisibleOnAllWorkspaces(true)
    }

    w.on('closed', () => {w = null;});
    return w;
  }

  recreateWindow(d){
    this.removeWindow(d);
    this.createWindow(d);
  }

  removeWindow(d){
    this.mainWindows[d.id].close();
    this.mainWindows[d.id] = null;
  }
  getMainWindowWithMouse(){return this.getWindowWithDisplay(electron.screen.getDisplayNearestPoint(electron.screen.getCursorScreenPoint()));}

  watchMousePoint(){
    var p = electron.screen.getCursorScreenPoint();
    var d = this.getWindowWithDisplay(electron.screen.getDisplayNearestPoint(p));
    d.webContents.send('mouse', p)
  }

  getAllMainWindows(){return Object.keys(this.mainWindows).map(k=>this.mainWindows[k])}
  getMainWindow(){return this.mainWindows[electron.screen.getPrimaryDisplay().id];}
  switchPause(w) {
    this.pause = !this.pause;
    var w = this.getMainWindow();
    if(w != null) w.webContents.send('switch_pause', this.pause);
  }
}

module.exports = MickrWindow
