if(typeof process !== 'undefined' && typeof require !== 'undefined'){
const url = require('url')
const path = require('path')
const electron = require('electron')
const fs = require('fs')
const svm = new (require('./SVM/SVM.js'))
const Mickr = require('./Mickr.js')
if(process.type == 'browser'){
/*********************************************************
	Main Process
*********************************************************/
class DomPickrMain{
	constructor(){
		this.window = null
		this.mickr = null
		this.initApp(electron.app)
		this.initIpc(electron.ipcMain)
	}

	initApp(app){
		app.on('ready', ()=>{
			this.window = new Pindow()
		})
	}

	initIpc(ipc){
		ipc.on('setMickrClient',(self,body)=>{
			this.mickr = new Mickr()
			this.mickr.activeWindow()
			this.setMickrClient(body.option)
		})
		ipc.on('webcontents',(self,body)=>{
			body.type = 'webcontents'
			this.mickr.sendWebContents(body)
		})
	}

	setMickrClient(option){
		option.url = option.url || 'ws://apps.wisdomweb.net:64260/ws/mik'
		this.mickr.setClient(option)
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
		const loginButton = document.getElementById('login-button')
		loginButton.onclick = (e)=>{
			const id = document.getElementById('dmp-components__input-id').value
			const site = document.getElementById('dmp-components__input-site').value
			const token = document.getElementById('dmp-components__input-token').value
			this.setMickrClient({id,site,token})
			this.display('browser')
			const url = 'http://www-toralab.ics.nitech.ac.jp/'
			this.addTab(url)
		}

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
			webview.isTransable = true
			if(!webview.canGoBack()){
				return
			}
			webview.goBack()
		}
		const forwardButton = document.getElementById('dmp-components__web-forward')
		forwardButton.onclick = (e)=>{
			const webview = this.getActivedWebview()
			webview.isTransable = true
			if(!webview.canGoForward()){
				return
			}
			webview.goForward()
		}
		const reloadButton = document.getElementById('dmp-components__web-reload')
		reloadButton.onclick = (e)=>{
			const webview = this.getActivedWebview()
			webview.isTransable = true
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

		this.display('login')
	}

	display(title){
		switch(title){
			case 'login':
			document.getElementById('dmp-components__login').classList.add('is-active')
			document.getElementById('dmp-components__web').classList.remove('is-active')
			break
			case 'browser':
			document.getElementById('dmp-components__login').classList.remove('is-active')
			document.getElementById('dmp-components__web').classList.add('is-active')
			break
		}
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
		const didStartLoading = (e)=>{
			if(!webview.isTransable){
				webview.stop()
			}
		}

		webview.addEventListener('dom-ready',(e)=>{
			webview.openDevTools()
			webview.isTransable = true
			webview.removeEventListener('did-start-loading', didStartLoading)
			webview.addEventListener('did-start-loading', didStartLoading)
		})

		webview.addEventListener('new-window',(e)=>{
			this.addTab(e.url)
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

	setMickrClient(option){
		electron.ipcRenderer.send('setMickrClient',{option})
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
				break
				case 'screen_share':
				shareIcon.innerHTML = 'stop_screen_share'
				shareIcon.style.color = 'gray'
				break
			}
			webview.isTransable = !webview.isTransable
			webview.send('setTransable',webview.isTransable)
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
		webview.isTransable = true
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
		this.minBlockElements = null
		this.ipc = null
		this.mickr = null
		this.BLOCK_TAG = ['P','BLOCKQUOTE','PRE','DIV','NOSCRIPT','HR','ADDRESS','FIELDSET','LEGEND','H1','H2','H3','H4','H5','H6','UL','OL','LI','DL','DT','DD','TABLE','CAPTION','THEAD','TBODY','COLGROUP','COL','TR','TH','TD']
		this.BLOCK_DISPLAY = ['block','list-item','inline-block','flex']
		this.EXCEPTION_TAG = ['SCRIPT','STYLE','LINK','#comment']
		this.TEXT_FILE_PATH = __dirname+'/train/train.txt'
		window.addEventListener('load',()=>{
			this.init()
		})
	}

	init(){
		const setCover2 = (elem,span)=>{
			var rect = {left:window.innerWidth,top:window.innerHeight,width:0,height:0}
			var range = document.createRange()
			if(elem.nodeName == '#text'){
				range.setStart(elem,0)
				range.setEnd(elem,elem.textContent.length)
				const rects = range.getClientRects()
				for(var j=0;j<rects.length;j++){
					const tmp = rects[j]
					if(rect.left > tmp.left){
						rect.lect = tmp.left
					}
					if(rect.top > tmp.top){
						rect.top = tmp.top
					}
					if(rect.width < tmp.width){
						rect.width = tmp.width
					}
					if(rect.height < tmp.height){
						rect.height = tmp.height
					}
				}
			} else {
				rect = elem.getBoundingClientRect()
			}
			span.style.left = (rect.left+window.scrollX)+'px'
			span.style.top = (rect.top+window.scrollY)+'px'
			span.style.width = rect.width+'px'
			span.style.height = rect.height+'px'
			return span
		}
		this.transable = true
		this.callBack = {}
		this.minBlockElements = []
		this.ipc = electron.ipcRenderer
		this.ipc.on('setTransable',(e,transable)=>{
			this.transable = transable
			if(!this.parentsSpans){
				this.parentsSpans = []
				for(var i=0;i<this.parents.length;i++){
					const a = this.parents[i]
					var span = document.createElement('span')
					span.style.position = 'absolute'
					span.style.zIndex = '1999999999'
					span.style.backgroundColor = 'rgba(200,50,50,0.3)'
					span = setCover2(a,span)
					span.style.pointerEvents = 'none'
					this.parentsSpans.push(span)
					document.body.appendChild(span)
				}
			}
			if(this.transable){
				this.span.style.display = 'none'
				this.parentsSpans.forEach((elem)=>{
					elem.style.display = 'none'
				})
			} else {
				this.span.style.display = 'inline'
				this.parentsSpans.forEach((elem)=>{
					elem.style.display = 'inline'
				})
			}
		})
		console.log('start')
		this.classifyElements(document.body)
		console.log('classified')
		const params = this.getTitleBlockCheckParams()
		console.log('getParams')

		svm.setPyFile(path.join(__dirname, 'SVM/svm.py'))
		svm.setModelFile(path.join(__dirname, 'SVM/web.pkl'))
		svm.predict(params,10)
		.then((result)=>{
			this.onPredict(result)
		})

		return
		// データセット用意のため
		var current = -1
		const addData = (bool)=>{
			fs.appendFile(this.TEXT_FILE_PATH, params[current]+',' + (bool ? '1' : '0') + '\n', 'utf8', (err)=>{})
		}
		const span = document.createElement('span')
		const okButton = document.createElement('span')
		const noButton = document.createElement('span')
		okButton.addEventListener('click',()=>{
			addData(true)
			nextBlock()
		})
		noButton.addEventListener('click',()=>{
			addData(false)
			nextBlock()
		})
		okButton.addEventListener('mouseover',()=>{
			okButton.style.backgroundColor = 'rgba(255,100,100,0.5)'
		})
		okButton.addEventListener('mouseleave',()=>{
			okButton.style.backgroundColor = 'rgba(200,50,50,0.5)'
		})
		noButton.addEventListener('mouseover',()=>{
			noButton.style.backgroundColor = 'rgba(100,100,255,0.5)'
		})
		noButton.addEventListener('mouseleave',()=>{
			noButton.style.backgroundColor = 'rgba(50,50,200,0.5)'
		})

		span.style.position = 'absolute'
		span.style.zIndex = '1999999999'
		okButton.style.position = 'absolute'
		okButton.classList.add('okButton')
		okButton.style.backgroundColor = 'rgba(200,50,50,0.5)'
		noButton.style.position = 'absolute'
		noButton.classList.add('noButton')
		noButton.style.backgroundColor = 'rgba(50,50,200,0.5)'
		span.appendChild(okButton)
		span.appendChild(noButton)
		document.body.appendChild(span)

		const setCover = (elem)=>{
			var rect = {left:window.innerWidth,top:window.innerHeight,width:0,height:0}
			var range = document.createRange()
			if(elem.nodeName == '#text'){
				range.setStart(elem,0)
				range.setEnd(elem,elem.textContent.length)
				const rects = range.getClientRects()
				for(var j=0;j<rects.length;j++){
					const tmp = rects[j]
					if(rect.left > tmp.left){
						rect.lect = tmp.left
					}
					if(rect.top > tmp.top){
						rect.top = tmp.top
					}
					if(rect.width < tmp.width){
						rect.width = tmp.width
					}
					if(rect.height < tmp.height){
						rect.height = tmp.height
					}
				}
			} else {
				rect = elem.getBoundingClientRect()
			}
			if(rect.width <= 1 || rect.height <= 1){
				nextBlock()
				return
			}
			span.style.left = (rect.left+window.scrollX)+'px'
			span.style.top = (rect.top+window.scrollY)+'px'
			span.style.width = rect.width+'px'
			span.style.height = rect.height+'px'
			okButton.style.left = '0px'
			okButton.style.top = '0px'
			okButton.style.width = rect.width/2+'px'
			okButton.style.height = rect.height+'px'
			noButton.style.left = rect.width/2+'px'
			noButton.style.top = '0px'
			noButton.style.width = rect.width/2+'px'
			noButton.style.height = rect.height+'px'

		}
		const nextBlock = ()=>{
			current++
			if(current >= this.minBlockElements.length){
				console.log('終了！お疲れ様！')
				return
			}
			console.log(this.minBlockElements[current],(current+1)+'/'+this.minBlockElements.length)
			const elem = this.minBlockElements[current]
			setCover(elem)
		}

		console.log('ready')
		nextBlock()
	}

	sendWebContents(elem){
		const nodeName = elem.nodeName
		const href = location.href
		var index = -1
		if(nodeName != '#text'){
			const sameNodeNameCollection = document.getElementsByTagName(nodeName)
			for(var i=0;i<sameNodeNameCollection.length;i++){
				const elem2 = sameNodeNameCollection[i]
				if(elem==elem2){
					index = i
					break
				}
			}
		}
		this.ipc.send('webcontents',{nodeName,index,href})
	}

	onPredict(result){
		var aiueo = null
		this.span = document.createElement('span')
		this.span.style.position = 'absolute'
		this.span.style.zIndex = '1999999999'
		this.span.style.backgroundColor = 'rgba(50,50,200,0.5)'
		this.span.style.display = 'none'
		this.span.addEventListener('click',()=>{
			if(!aiueo){
				return
			}
			console.log(aiueo)
			this.sendWebContents(aiueo)
		})
		const setCover = (elem)=>{
			var rect = {left:window.innerWidth,top:window.innerHeight,width:0,height:0}
			var range = document.createRange()
			if(elem.nodeName == '#text'){
				range.setStart(elem,0)
				range.setEnd(elem,elem.textContent.length)
				const rects = range.getClientRects()
				for(var j=0;j<rects.length;j++){
					const tmp = rects[j]
					if(rect.left > tmp.left){
						rect.lect = tmp.left
					}
					if(rect.top > tmp.top){
						rect.top = tmp.top
					}
					if(rect.width < tmp.width){
						rect.width = tmp.width
					}
					if(rect.height < tmp.height){
						rect.height = tmp.height
					}
				}
			} else {
				rect = elem.getBoundingClientRect()
			}
			this.span.style.left = (rect.left+window.scrollX)+'px'
			this.span.style.top = (rect.top+window.scrollY)+'px'
			this.span.style.width = rect.width+'px'
			this.span.style.height = rect.height+'px'
		}
		const parents = []
		for(var i=0;i<result.length;i++){
			if(result[i]==1){
				if(parents.indexOf(this.minBlockElements[i])==-1){
					parents.push(this.minBlockElements[i])
				}
				// const titleBlock = this.minBlockElements[i]
				// titleBlock.addEventListener('mouseover',()=>{
				// 	if(!this.isTransable){
				// 		setCover(titleBlock.parentNode)
				// 	}
				// 	aiueo = titleBlock
				// })
			}
		}
		for(var i=0;i<parents.length;i++){
			const elem = parents[i]
			elem.addEventListener('mouseover',()=>{
				aiueo = elem.parentNode
				setCover(elem)
			})
		}
		this.setCover = setCover
		document.body.appendChild(this.span)
		this.parents = parents
	}

	// parentが細分化ブロックならtrueを返す
	classifyElements(parent){
		const childNodes = parent.childNodes

		var hasBlockElement = false
		var hasMinBlockElement = false
		for(var i=0;i<childNodes.length;i++){
			const child = childNodes[i]
			if(this.isBlockElement(child)){
				hasBlockElement = true
			}
			if(this.classifyElements(child)){
				hasMinBlockElement = true
			}
		}

		if(hasMinBlockElement){
			for(var i=0;i<childNodes.length;i++){
				const child = childNodes[i]
				if(!this.isBlockElement(child) && this.validyCheck(child) && this.EXCEPTION_TAG.indexOf(child.nodeName) == -1){
					this.minBlockElements.push(child)
				}
			}
			hasBlockElement = true
		}

		const isBlockElement = this.isBlockElement(parent)
		const contained = this.minBlockElements.indexOf(parent) != -1
		if(!hasBlockElement && isBlockElement && !contained && this.EXCEPTION_TAG.indexOf(parent.nodeName) == -1 && this.validyCheck(parent)){
			this.minBlockElements.push(parent)
			return true
		}

		return false
	}

	isBlockElement(elem){
		if(elem.nodeName == '#text' || elem.nodeName == '#comment'){
			return false
		}

		const rule1 = this.validyCheck(elem)
		const rule2 = this.BLOCK_DISPLAY.indexOf(document.defaultView.getComputedStyle(elem,null).getPropertyValue('display')) != -1
		const rule3 = this.BLOCK_TAG.indexOf(elem.nodeName) != -1

		return rule1 && rule2 && rule3
	}

	validyCheck(elem){
		if(elem.nodeName == '#comment'){
			return false
		}
		var rect = {left:window.innerWidth,top:window.innerHeight,width:0,height:0}
		var rule1 = true
		var rule2 = true
		var rule3 = true
		var rule4 = true
		var range = document.createRange()
		if(elem.nodeName == '#text'){
			range.setStart(elem,0)
			range.setEnd(elem,elem.textContent.length)
			const rects = range.getClientRects()
			for(var j=0;j<rects.length;j++){
				const tmp = rects[j]
				if(rect.left > tmp.left){
					rect.lect = tmp.left
				}
				if(rect.top > tmp.top){
					rect.top = tmp.top
				}
				if(rect.width < tmp.width){
					rect.width = tmp.width
				}
				if(rect.height < tmp.height){
					rect.height = tmp.height
				}
			}
			rule1 = rect.width > 0 && rect.height > 0
			rule2 = rect.right > 0 && rect.bottom > 0
			rule3 = rule1 && rule2
		} else {
			rect = elem.getBoundingClientRect()
			rule1 = rect.width > 0 && rect.height > 0
			rule2 = rect.right > 0 && rect.bottom > 0
			rule3 = document.defaultView.getComputedStyle(elem,null).getPropertyValue('display') != 'none'
			rule4 = document.defaultView.getComputedStyle(elem,null).getPropertyValue('visibility') != 'hidden'
		}

		return rule1 && rule2 && rule3 && rule4
	}

	getTitleBlockCheckParams(){
		var params = []
		const doAllChildren = (parent,call)=>{
			const children = parent.childNodes
			for(var i=0;i<children.length;i++){
				const child = children[i]
				doAllChildren(child,call)
				call(parent)
			}
		}
		const doAllNextSibling = (elder,call)=>{
			var sibling = elder
			while(sibling.nextElementSibling){
				sibling = sibling.nextElementSibling
				call(sibling)
			}
		}
		const doAllPreviousElementSibling = (younger,call)=>{
			var sibling = younger
			while(sibling.previousElementSibling){
				sibling = sibling.previousElementSibling
				call(sibling)
			}
		}

		for(var i=0;i<this.minBlockElements.length;i++){
			const elem = this.minBlockElements[i]
			var text = ''
			var textArea = 0
			var imgArea = 0
			var range = document.createRange()
			var childCount = 0
			doAllChildren(elem,(child)=>{
				if(child.nodeName == '#text'){
					text += child.textContent
					range.setStart(child,0)
					range.setEnd(child,child.textContent.length)
					const rects = range.getClientRects()
					for(var j=0;j<rects.length;j++){
						const rect = rects[j]
						textArea += rect.width*rect.height
					}
				} else if(child.nodeName == 'IMG' || document.defaultView.getComputedStyle(child,null).getPropertyValue('background-image') != 'none'){
					imgArea += child.offsetWidth*child.offsetHeight
				}
				if(this.EXCEPTION_TAG.indexOf(child.nodeName) == -1 && child.nodeName != '#text' && child.nodeName.nodeName != '#comment'){
					childCount++
				}
			})
			var rect = {left:window.innerWidth,top:window.innerHeight,width:0,height:0}
			if(elem.nodeName == '#text'){
				range.setStart(elem,0)
				range.setEnd(elem,elem.textContent.length)
				const rects = range.getClientRects()
				for(var j=0;j<rects.length;j++){
					const tmp = rects[j]
					if(rect.left > tmp.left){
						rect.lect = tmp.left
					}
					if(rect.top > tmp.top){
						rect.top = tmp.top
					}
					if(rect.width < tmp.width){
						rect.width = tmp.width
					}
					if(rect.height < tmp.height){
						rect.height = tmp.height
					}
				}
			} else {
				rect = {left:elem.offsetLeft,top:elem.offsetTop,width:elem.offsetWidth,height:elem.offsetHeight}
			}
			if(rect.width == 0 || rect.height==0){
				console.log(elem)
			}
			const nodeArea = rect.width*rect.height
			var nextSiblingNodeArea = 0
			if(elem.nextElementSibling){
				nextSiblingNodeArea = elem.nextElementSibling.offsetWidth*elem.nextElementSibling.offsetHeight
			}
			var continued = true
			var nextElementSiblingCount = 0
			doAllNextSibling(elem,(sibling)=>{
				while(continued && sibling.childNodes.length == 1 && (sibling.firstChild.nodeName == sibling.nodeName != '#text' != '#comment' || !(document.defaultView.getComputedStyle(sibling.firstChild,null).getPropertyValue('background-image')!='none' ^ document.defaultView.getComputedStyle(sibling,null).getPropertyValue('background-image')!='none'))){
					sibling = sibling.firstChild
				}
				if(continued && (sibling.nodeName == elem.nodeName != '#text' != '#comment' || (document.defaultView.getComputedStyle(elem,null).getPropertyValue('background-image')!='none' ^ document.defaultView.getComputedStyle(sibling,null).getPropertyValue('background-image')!='none'))){
					nextElementSiblingCount++
				} else {
					continued = false
				}
			})
			var previousElementSiblingCount = 0
			continued = true
			doAllPreviousElementSibling(elem,(sibling)=>{
				while(continued && sibling.childNodes.length == 1 && (sibling.firstChild.nodeName == sibling.nodeName != '#text' != '#comment' || !(document.defaultView.getComputedStyle(sibling.firstChild,null).getPropertyValue('background-image')!='none' ^ document.defaultView.getComputedStyle(sibling,null).getPropertyValue('background-image')!='none'))){
					sibling = sibling.firstChild
				}
				if(continued && (sibling.nodeName == elem.nodeName != '#text' != '#comment' || (document.defaultView.getComputedStyle(elem,null).getPropertyValue('background-image')!='none' ^ document.defaultView.getComputedStyle(sibling,null).getPropertyValue('background-image')!='none'))){
					previousElementSiblingCount++
				} else {
					continued = false
				}
			})
			var notLinkParent = elem
			while(notLinkParent.parentNode && notLinkParent.parentNode.nodeName != 'A'){
				notLinkParent = notLinkParent.parentNode
			}
			var notLinkChild = elem
			while(notLinkChild.childNodes.length == 1 && notLinkChild.firstChild.nodeName != 'A'){
				notLinkChild = notLinkChild.firstChild
			}
			const f1 = text.length
			const f2 = textArea/nodeArea
			const f3 = imgArea/nodeArea
			const f4 = rect.width/rect.height
			const f5 = nextSiblingNodeArea > nodeArea ? 1 : 0
			const f6 = nextElementSiblingCount
			const f7 = previousElementSiblingCount
			const f8 = childCount
			const f9 = notLinkParent.parentNode && notLinkParent.parentNode.nodeName == 'A' ? 1 : 0
			const f10 = notLinkChild.firstChild && notLinkChild.firstChild.nodeName == 'A' ? 1 : 0
			params.push([f1,f2,f3,f4,f5,f6,f7,f8,f9,f10])
		}
		return params
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

	clearEventListener(tagName, eventType){
		if(!this.callBack[tagName] || !this.callBack[tagName][eventType]){
			return
		}
	}
}
module.exports = DomPickrWebview
}}