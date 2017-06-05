const url = require('url')
const path = require('path')
const electron = require('electron')

/*********************************************************
	Main Process
*********************************************************/


class DomPickrMain{
	constructor(){
		this.window = null;

		this.initApp(electron.app)
		this.initIpc(electron.ipcMain)
	}

	initApp(app){
		app.on('ready', ()=>{
			this.window = new Pindow()
		});
	}
}

class Pindow extends electron.BrowserWindow{
	constructor(){
		super({
			width: 1200,
			height: 800,
			titleBarStyle: 'hidden'
		});

		this.loadURL(url.format({
			pathname: path.join(__dirname, '../htmls/window.html'),
			protocol: 'file:',
			slashes: true
		}));
	}

	sendMessage(title, body){
		this.webContents.send(title, body);
	}
}


/*********************************************************
	Renderer Process
*********************************************************/
class DomPickrRenderer{
	constructor(){

	}
}


/*********************************************************
	Pickr Process
*********************************************************/

module.exports = {
	main: DomPickrMain,
	renderer: DomPickrRenderer
};