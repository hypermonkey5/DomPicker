if(typeof process !== "undefined" && typeof require !== "undefined"){

const url = require('url')
const path = require('path')
const electron = require('electron')
if(process.type == 'browser' && process.type != 'renderer'){
/*********************************************************
	Main Process
*********************************************************/

class DomPickrMain{
	constructor(){
		this.window = null;

		this.initApp(electron.app);
	}

	initApp(app){
		app.on('ready', ()=>{
			this.window = new Pindow();
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

module.exports = DomPickrMain
} else if(process.type != 'browser' && process.type == 'renderer') {
/*********************************************************
	Renderer Process
*********************************************************/
class DomPickrRenderer{
	constructor(){
		this.webContents = null;
		this.MAX_TAB_NUMBER = 5;
		this.INIT_URL = url.format({
			pathname: path.join(__dirname, '../htmls/init.html'),
			protocol: 'file:',
			slashes: true
		});
		window.onload = ()=>{
			this.init()
		}
	}

	init(){
		this.webContents = {}
		const addTabButton = document.getElementById('dmp-tabs__add-tab')
		addTabButton.onclick = (e)=>{
			this.addTab(this.INIT_URL)
		}

		const searchButton = document.getElementById("dmp-components__web-search-input")
		searchButton.onkeydown = (e)=>{
			if(e.keyCode == 13){
				this.search(searchButton.value)
			}
		}

		const backButton = document.getElementById("dmp-components__web-back")
		backButton.onclick = (e)=>{
			const webview = this.getCurrentWebview()
			if(!webview || !webview.canGoBack()){
				return
			}
			webview.goBack()
		}
		const forwardButton = document.getElementById("dmp-components__web-forward")
		forwardButton.onclick = (e)=>{
			const webview = this.getCurrentWebview()
			if(!webview || !webview.canGoForward()){
				return
			}
			webview.goForward()
		}
		const reloadButton = document.getElementById("dmp-components__web-reload")
		reloadButton.onclick = (e)=>{
			const webview = this.getCurrentWebview()
			if(!webview){
				return
			}
			webview.reload()
		}
	}

	addTab(url){
		const id = this.createUniqueId()
		const tab = document.createElement('a')
		tab.setAttribute('href','#dmp-webviews__webview-'+id)
		tab.setAttribute('id','dmp-tabs__tab-'+id)
		tab.classList.add('mdl-tabs__tab')
		tab.addEventListener('DOMNodeInserted',(e)=>{
			if(document.getElementById('dmp-tabs__tab-bar') == e.relatedNode){
				this.webContents[id] = {
					tab,webview,frame: webviewFrame
				}
				this.repositionCloseButton(id)
			}
		})

		const titleFrame = document.createElement('span')
		titleFrame.classList.add('dmp-tab__title')
		titleFrame.innerHTML = "新しいタブ"
		tab.appendChild(titleFrame)

		const webviewFrame = document.createElement('span')
		webviewFrame.setAttribute('id','dmp-webviews__webview-'+id)
		webviewFrame.classList.add('dmp-tabs__panel')
		webviewFrame.classList.add('mdl-tabs__panel')

		const webview = document.createElement('webview')
		webviewFrame.appendChild(webview)

		webview.addEventListener('update-target-url',(e)=>{
			if(webviewFrame.classList.contains('is-active')){
				this.setHeaderURL(webview.getURL())
			}
		})

		webview.addEventListener('page-title-updated',(e)=>{
			this.setTabTitle(id,webview.getTitle())
			this.repositionCloseButton()
		})
		webview.addEventListener('dom-ready',(e)=>{
			// webview.openDevTools()
		})

		this.deactiveTabs()
		tab.classList.add('is-active')
		webviewFrame.classList.add('is-active')

		// webview.setAttribute('preload',path.join('file://',__dirname,'../','javascripts/preload.js'))
		webview.setAttribute('src',url)

		document.getElementById('dmp-tabs__tab-bar').appendChild(tab)
		document.getElementById('dmp-components__web-frame').appendChild(webviewFrame)
		componentHandler.downgradeElements(document.getElementById('dmp-tabs'))
		componentHandler.upgradeElements(document.getElementById('dmp-tabs'))
	}

	removeWebContent(id){
		document.getElementById('dmp-tabs__tab-bar').removeChild(document.getElementById('dmp-tabs__tab-'+id))
		document.getElementById('dmp-components__web-frame').removeChild(document.getElementById('dmp-webviews__webview-'+id))
		componentHandler.downgradeElements(document.getElementById('dmp-tabs'))
		componentHandler.upgradeElements(document.getElementById('dmp-tabs'))
		delete this.webContents[id]
	}

	deactiveTabs(){
		for(const id in this.webContents){
			const tab = this.webContents[id].tab
			const frame = this.webContents[id].frame
			tab.classList.remove('is-active')
			frame.classList.remove('is-active')
		}
	}

	setTabTitle(id,title){
		const tab = document.getElementById('dmp-tabs__tab-'+id)
		const titleFrame = tab.getElementsByClassName('dmp-tab__title')[0]
		titleFrame.textContent = title
	}

	setHeaderURL(url){
		const searchBar = document.getElementById("dmp-components__web-search-input")
		const barFrame = document.getElementById("dmp-components__web-search-bar")
		searchBar.value = url == this.INIT_URL ? '' : url
		if(searchBar.value == ''){
			return;
		}
		barFrame.classList.add("is-dirty")
	}

	setCloseButton(id){
		const tab = document.getElementById('dmp-tabs__tab-'+id)

		const closeButton = document.createElement('button')
		closeButton.classList.add('mdl-button')
		closeButton.classList.add('mdl-js-button')
		closeButton.classList.add('mdl-button--icon')
		closeButton.classList.add('dmp-tabs__close-button')
		closeButton.style.zIndex = 1000
		closeButton.onclick = (e)=>{
			document.getElementById('dmp-tabs__tab-bar').removeChild(closeButton)
			this.removeWebContent(id)
			this.repositionCloseButton()
		}

		const icon = document.createElement('i')
		icon.classList.add('material-icons')
		icon.innerHTML = 'clear'
		closeButton.appendChild(icon)

		icon.style.fontSize = '18px'
		closeButton.style.position = 'absolute'
		closeButton.style.minWidth = '24px'
		closeButton.style.width = '24px'
		closeButton.style.height = '24px'
		closeButton.style.left = (tab.offsetLeft + tab.offsetWidth-24)+'px'
		closeButton.style.top = '1px'

		document.getElementById('dmp-tabs__tab-bar').appendChild(closeButton)
	}

	repositionCloseButton(){
		const closeButtons = document.getElementsByClassName('dmp-tabs__close-button')
		const tabBar = document.getElementById('dmp-tabs__tab-bar')
		while(closeButtons[0]){tabBar.removeChild(closeButtons[0])}
		for(const id in this.webContents){
			this.setCloseButton(id)
		}
	}

	createUniqueId(){
		return Math.random().toString(36).slice(-8)
	}

	getCurrentWebview(){
		const webFrame = document.getElementById('dmp-components__web-frame')
		if(!webFrame){
			return
		}
		const activeWebFrame = webFrame.getElementsByClassName("is-active")[0]
		if(!activeWebFrame){
			return
		}
		const activeWebview = activeWebFrame.firstChild
		if(!activeWebview){
			return
		}
		return activeWebview
	}

	search(url){
		const webview = this.getCurrentWebview()
		if(!webview){
			return
		}
		var src = url
		if(!((url.indexOf("https://")==0 && url.length > 8) || (url.indexOf("http://")==0 && url.length > 7))){
			url = url.replace(/　/g," ")
			const keywords = url.split(" ")
			src = "https://www.google.co.jp/#q="+keywords.reduce((pre,curr,index)=>{
				if(pre==""){
					return encodeURIComponent(curr)
				} else {
					return pre+"+"+encodeURIComponent(curr)
				}
			},"")
		}
		webview.setAttribute("src",src)
	}
}

module.exports = DomPickrRenderer
}} else {
/*********************************************************
	Pickr Process
*********************************************************/
}