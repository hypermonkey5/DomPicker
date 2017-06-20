const electron = require('electron');
const url = require('url')
const path = require('path');
const MickrClient = require('./Mickr/modules/MickrClient.js')

if(process.type == 'browser'){
/*********************************************************
	Main Process
*********************************************************/
const {Tray} = electron;
const MickrWindow = require('./Mickr/modules/MickrWindow.js')
class Mickr{
	constructor(){
		this.wm = new MickrWindow()
		this.tray2 = null
		this.client = null
	}

	activeWindow(){
		this.wm.activateMainWindows();
	}

	setClient(option){
		this.client = new MickrClient(option)
		this.client.on('mickr', (req, res) => {
			this.wm.getMainWindow().send('mickr', req.body.content);
		})
		setInterval(()=>{this.wm.watchMousePoint()},80)
	}

	sendWebContents(body){
		this.wm.getMainWindow().send('mickr', body)
	}
}

module.exports = Mickr

} else if(process.type == 'renderer'){
/*********************************************************
	Renderer Process
*********************************************************/
class Mickr{
	constructor(){
		this.client = null
	}
	setClient(option){
		this.client = new MickrClient(option)
	}
}

module.exports = Mickr

}