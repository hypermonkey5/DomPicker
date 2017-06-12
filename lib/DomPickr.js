if(typeof process !== 'undefined' && typeof require !== 'undefined'){
const url = require('url')
const path = require('path')
const electron = require('electron')
if(process.type == 'browser'){
/*********************************************************
	Main Process
*********************************************************/

class DomPickrMain{
	constructor(){
		this.window = null

		this.initApp(electron.app)
	}

	initApp(app){
		app.on('ready', ()=>{
			this.window = new Pindow()
		})
	}
}

class Pindow extends electron.BrowserWindow{
	constructor(){
		super({
			width: 1200,
			height: 800,
			titleBarStyle: 'hidden'
		})

		this.loadURL(url.format({
			pathname: path.join(__dirname, '../htmls/window.html'),
			protocol: 'file:',
			slashes: true
		}))
	}

	sendMessage(title, body){
		this.webContents.send(title, body)
	}
}

module.exports = DomPickrMain
} else if(process.type == 'renderer' && typeof process.guestInstanceId === 'undefined') {
/*********************************************************
	Renderer Process
*********************************************************/
class DomPickrRenderer{
	constructor(){
		this.webContents = null
		this.favContents = null
		this.MAX_TAB_NUMBER = 5
		this.INIT_URL = url.format({
			pathname: path.join(__dirname, '../htmls/init.html'),
			protocol: 'file:',
			slashes: true
		})
		window.onload = ()=>{
			this.init()
		}
	}

	init(){
		this.webContents = {}
		this.favContents = {}
		const addTabButton = document.getElementById('dmp-tabs__add-tab')
		addTabButton.onclick = (e)=>{
			this.addTab(this.INIT_URL)
		}

		const searchButton = document.getElementById('dmp-components__web-search-input')
		searchButton.onkeydown = (e)=>{
			if(e.keyCode == 13){
				this.search(searchButton.value)
			}
		}

		const backButton = document.getElementById('dmp-components__web-back')
		backButton.onclick = (e)=>{
			const webview = this.getActivedWebview()
			if(!webview.canGoBack()){
				return
			}
			webview.goBack()
		}
		const forwardButton = document.getElementById('dmp-components__web-forward')
		forwardButton.onclick = (e)=>{
			const webview = this.getActivedWebview()
			if(!webview.canGoForward()){
				return
			}
			webview.goForward()
		}
		const reloadButton = document.getElementById('dmp-components__web-reload')
		reloadButton.onclick = (e)=>{
			const webview = this.getActivedWebview()
			webview.reload()
		}

		const favButton = document.getElementById('dmp-components__web-favorite')
		favButton.onclick = (e)=>{
			const webview = this.getActivedWebview()
			this.addFavSite(webview.getTitle(),webview.getURL())
		}

		window.addEventListener('resize',(e)=>{
			this.repositionTabOptionButton()
		})

		/******************
			Debug
		******************/
		const url = 'https://www.nintendo.co.jp/'
		this.addTab(url)
	}

	closeApp(){
		electron.remote.getCurrentWindow().close()
	}

	addFavSite(title,url){
		this.favContents[url] = title
		const favSiteButton = document.createElement('button')
		favSiteButton.classList.add('dmp-components__web-favorite-button')
		favSiteButton.innerHTML = title
		favSiteButton.onclick = (e)=>{
			this.search(url)
		}

		const favButtonFrame = document.getElementById('dmp-components__web-header-favorite')
		favButtonFrame.appendChild(favSiteButton)
		this.updateFavIcon(url)
	}

	updateFavIcon(url){
		this.setFavIcon(this.isFavSite(url))
	}

	isFavSite(url){
		return this.favContents[url]!==undefined
	}

	setFavIcon(bool){
		const favButton = document.getElementById('dmp-components__web-favorite')
		if(bool){
			favButton.innerText = 'star'
			favButton.classList.add('is-favorite')
		} else {
			favButton.innerText = 'star_border'
			favButton.classList.remove('is-favorite')
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
				this.repositionTabOptionButton(id)
			}
		})
		tab.addEventListener('click',(e)=>{
			this.setHeaderURL(webview.getURL())
		})

		const titleFrame = document.createElement('span')
		titleFrame.classList.add('dmp-tab__title')
		titleFrame.innerHTML = '新しいタブ'
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
			this.repositionTabOptionButton()
		})
		webview.addEventListener('dom-ready',(e)=>{
			webview.openDevTools()
		})

		this.deactiveTabs()
		tab.classList.add('is-active')
		webviewFrame.classList.add('is-active')

		webview.setAttribute('preload',path.join('file://',__dirname,'../','htmls/js/webview.js'))
		webview.setAttribute('src',url)

		document.getElementById('dmp-tabs__tab-bar').appendChild(tab)
		document.getElementById('dmp-components__web-frame').appendChild(webviewFrame)
		componentHandler.downgradeElements(document.getElementById('dmp-tabs'))
		componentHandler.upgradeElements(document.getElementById('dmp-tabs'))

		this.resetUpgradeSpan()
	}

	resetUpgradeSpan(){
		for(const id in this.webContents){
			const tab = this.webContents[id].tab
			const spans = tab.getElementsByClassName('mdl-tabs__ripple-container')
			while(spans[1]){
				tab.removeChild(spans[1])
			}
		}
	}

	removeWebContent(id){
		document.getElementById('dmp-tabs__tab-bar').removeChild(document.getElementById('dmp-tabs__tab-'+id))
		document.getElementById('dmp-components__web-frame').removeChild(document.getElementById('dmp-webviews__webview-'+id))
		componentHandler.downgradeElements(document.getElementById('dmp-tabs'))
		componentHandler.upgradeElements(document.getElementById('dmp-tabs'))
		delete this.webContents[id]
	}

	activeTab(id){
		const tab = this.webContents[id].tab
		const frame = this.webContents[id].frame
		tab.classList.add('is-active')
		frame.classList.add('is-active')
	}

	deactiveTab(id){
		const tab = this.webContents[id].tab
		const frame = this.webContents[id].frame
		tab.classList.remove('is-active')
		frame.classList.remove('is-active')
	}

	deactiveTabs(){
		for(const id in this.webContents){
			this.deactiveTab(id)
		}
	}

	activeRightestTab(){
		var rightest = null
		for(const id in this.webContents){
			this.deactiveTab(id)
			if(rightest && this.webContents[rightest].tab.offsetLeft < this.webContents[id].tab.offsetLeft){
				rightest = id
			} else if(!rightest){
				rightest = id
			}
		}
		this.activeTab(rightest)
	}

	activeNextTab(id,dir){
		if((dir!='right') && (dir!='left')){
			dir = 'left'
		}

		const BORDER = this.webContents[id].tab.offsetLeft
		var next = null
		for(const _id in this.webContents){
			this.deactiveTab(id)
			switch(dir){
				case 'left':
				if(next && this.webContents[_id].tab.offsetLeft < BORDER && this.webContents[next].tab.offsetLeft < this.webContents[_id].tab.offsetLeft){
					next = _id
				} else if(this.webContents[_id].tab.offsetLeft < BORDER && !next && _id!=id){
					next = _id
				}
				break;
				case 'right':
				if(next && this.webContents[_id].tab.offsetLeft > BORDER && this.webContents[next].tab.offsetLeft > this.webContents[_id].tab.offsetLeft){
					next = _id
				} else if(this.webContents[_id].tab.offsetLeft > BORDER && !next && _id!=id){
					next = _id
				}
				break;
			}
		}
		this.activeTab(next || id)
		return next || id
	}

	getRightestId(){
		var rightest = null
		for(const id in this.webContents){
			if(rightest && this.webContents[rightest].tab.offsetLeft < this.webContents[id].tab.offsetLeft){
				rightest = id
			} else if(!rightest){
				rightest = id
			}
		}
		return rightest
	}

	getLeftestId(){
		var leftest = null
		for(const id in this.webContents){
			if(leftest && this.webContents[leftest].tab.offsetLeft > this.webContents[id].tab.offsetLeft){
				leftest = id
			} else if(!leftest){
				leftest = id
			}
		}
		return leftest
	}

	isRightestId(id){
		return id == this.getRightestId()
	}

	isLeftestId(id){
		return id == this.getLeftestId()
	}

	setTabTitle(id,title){
		const tab = document.getElementById('dmp-tabs__tab-'+id)
		const titleFrame = tab.getElementsByClassName('dmp-tab__title')[0]
		titleFrame.textContent = title
	}

	setHeaderURL(url){
		this.updateFavIcon(url)
		const searchBar = document.getElementById('dmp-components__web-search-input')
		const barFrame = document.getElementById('dmp-components__web-search-bar')
		searchBar.value = url == this.INIT_URL ? '' : url
		if(searchBar.value == ''){
			barFrame.classList.remove('is-dirty')
			return
		}
		barFrame.classList.add('is-dirty')
	}

	setTabOptionButton(id){
		const tab = document.getElementById('dmp-tabs__tab-'+id)

		const closeButton = document.createElement('button')
		closeButton.classList.add('mdl-button')
		closeButton.classList.add('mdl-js-button')
		closeButton.classList.add('mdl-button--icon')
		closeButton.classList.add('dmp-tabs__close-button')
		closeButton.style.zIndex = 1000
		closeButton.onclick = (e)=>{
			document.getElementById('dmp-tabs__tab-bar').removeChild(closeButton)
			document.getElementById('dmp-tabs__tab-bar').removeChild(shareButton)
			if(this.isActivedId(id) && this.isRightestId(id)){
				const activedId = this.activeNextTab(id,'left')
				const url = this.webContents[activedId].webview.getURL()
				this.updateFavIcon(url)
			} else if(this.isActivedId(id)){
				const activedId = this.activeNextTab(id,'right')
				const url = this.webContents[activedId].webview.getURL()
				this.updateFavIcon(url)
			}
			this.removeWebContent(id)
			if(Object.keys(this.webContents).length==0){
				this.closeApp()
			}
			this.repositionTabOptionButton()
		}
		const closeIcon = document.createElement('i')
		closeIcon.classList.add('material-icons')
		closeIcon.innerHTML = 'clear'
		closeButton.appendChild(closeIcon)

		closeIcon.style.fontSize = '18px'
		closeButton.style.position = 'absolute'
		closeButton.style.minWidth = '24px'
		closeButton.style.width = '24px'
		closeButton.style.height = '24px'
		closeButton.style.left = (tab.offsetLeft + tab.offsetWidth-24)+'px'
		closeButton.style.top = '1px'

		document.getElementById('dmp-tabs__tab-bar').appendChild(closeButton)


		const shareButton = document.createElement('button')
		shareButton.classList.add('mdl-button')
		shareButton.classList.add('mdl-js-button')
		shareButton.classList.add('mdl-button--icon')
		shareButton.classList.add('dmp-tabs__share-button')
		shareButton.style.zIndex = 1000
		
		const webview = this.webContents[id].webview
		shareButton.onclick = (e)=>{
			switch(shareIcon.innerHTML){
				case 'stop_screen_share':
				shareIcon.innerHTML = 'screen_share'
				shareIcon.style.color = 'black'
				webview.send('prohibit-unload')
				break
				case 'screen_share':
				shareIcon.innerHTML = 'stop_screen_share'
				shareIcon.style.color = 'gray'
				webview.send('permit-unload')
				break
			}
		}
		const shareIcon = document.createElement('i')
		shareIcon.classList.add('material-icons')
		shareIcon.innerHTML = 'stop_screen_share'
		shareButton.appendChild(shareIcon)

		shareIcon.style.fontSize = '18px'
		shareIcon.style.color = 'gray'
		shareButton.style.position = 'absolute'
		shareButton.style.minWidth = '24px'
		shareButton.style.width = '24px'
		shareButton.style.height = '24px'
		shareButton.style.left = (tab.offsetLeft + tab.offsetWidth-24)+'px'
		shareButton.style.top = '28px'

		document.getElementById('dmp-tabs__tab-bar').appendChild(shareButton)
	}

	repositionTabOptionButton(){
		const closeButtons = document.getElementsByClassName('dmp-tabs__close-button')
		const shareButtons = document.getElementsByClassName('dmp-tabs__share-button')
		const tabBar = document.getElementById('dmp-tabs__tab-bar')
		while(closeButtons[0] && shareButtons[0]){
			tabBar.removeChild(closeButtons[0])
			tabBar.removeChild(shareButtons[0])
		}
		for(const id in this.webContents){
			this.setTabOptionButton(id)
		}
	}

	createUniqueId(){
		return Math.random().toString(36).slice(-8)
	}

	getActivedWebview(){
		const webFrame = document.getElementById('dmp-components__web-frame')
		if(!webFrame){
			return
		}
		const activeWebFrame = webFrame.getElementsByClassName('is-active')[0]
		if(!activeWebFrame){
			return
		}
		const activeWebview = activeWebFrame.firstChild
		if(!activeWebview){
			return
		}
		return activeWebview
	}

	getActivedId(){
		for(const id in this.webContents){
			const tab = this.webContents[id].tab
			if(tab.classList.contains('is-active')){
				return id
			}
		}
	}

	isActivedId(id){
		return id == this.getActivedId()
	}

	search(url){
		const webview = this.getActivedWebview()
		if(!webview){
			return
		}
		var src = url
		if(!((url.indexOf('https://')==0 && url.length > 8) || (url.indexOf('http://')==0 && url.length > 7))){
			url = url.replace(/　/g,' ')
			const keywords = url.split(' ')
			src = 'https://www.google.co.jp/#q='+keywords.reduce((pre,curr,index)=>{
				if(pre==''){
					return encodeURIComponent(curr)
				} else {
					return pre+'+'+encodeURIComponent(curr)
				}
			},'')
		}
		webview.setAttribute('src',src)
	}
}
module.exports = DomPickrRenderer
} else if(process.type == 'renderer' && typeof process.guestInstanceId !== 'undefined'){
/*********************************************************
	Pickr Process
*********************************************************/
class DomPickrWebview{
	constructor(){
		this.callBack = null
		window.onload = ()=>{
			this.init()
		}
	}

	init(){
		this.callBack = {}
		this.ipc = electron.ipcRenderer

		this.ipc.on('prohibit-unload',()=>{
			this.prohibitUnload()
		})
		this.ipc.on('permit-unload',()=>{
			this.permitUnload()
		})
	}

	prohibitUnload(){
	}

	permitUnload(){
	}

	setEventListener(tagName, eventType, call){
		this.callBack[tagName] = this.callBack[tagName] || {}
		this.callBack[tagName][eventType] = call
		const doms = document.getElementsByTagName(tagName)
		for(var i=0;i<doms.length;i++){
			const dom = doms[i]
			dom.addEventListener(eventType,this.callBack[tagName][eventType])
		}
	}
}
module.exports = DomPickrWebview
}}