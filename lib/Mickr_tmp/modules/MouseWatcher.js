const electron = require('electron')

class MouseWatcher{
  constructor(){
    setInterval(() => {
      var p = electron.screen.getCursorScreenPoint()
      console.log(p);
    }, 100)
  }
}

module.exports = MouseWatcher;
