(function(){
  // Node.js で動作しているか
  var isNode = (typeof process !== "undefined" && typeof require !== "undefined");
  var ipcRenderer = null;
  var capture = null;

  if(isNode) window.electron = require('electron');
  window.w = window.innerWidth;
  window.h = window.innerHeight;
  /* ランダムなID(文字列)の生成 */
  const generateRandomID = function(){return String(Math.random().toString(36).slice(-8))};
  /* ランダムな整数の生成 */
  const generateRandomInt = function(min,max){return Math.floor( Math.random() * (max - min + 1) ) + min};

  document.addEventListener('DOMContentLoaded', () => {
    if(isNode){
      ipcRenderer = electron.ipcRenderer;
      capture = electron.desktopCapturer;
      screen = electron.screen
    }
    window.Sky = Sky;
    window.Cloud = Cloud;
    window.MickrSky = MickrSky;
    window.MickrCloud = MickrCloud;
    window.MickrClient = MickrClient;
  })

  /*
  EventEmitter.js
  yusuken@toralab.org
  */
  class EventEmitter extends Object{
    constructor(){
      super()
      this.eventHandlerListByEventType = {};
      this.eventTypeList = [];
      this.eventHandlerListList = [];
    };
    on(eventType, eventHandler){
      let eventHandlerList = this.eventHandlerListByEventType[eventType];
      if (eventHandlerList == null) {
        eventHandlerList = [];
        this.eventHandlerListByEventType[eventType] = eventHandlerList;
      }
      eventHandlerList.push(eventHandler);
    };
    off(eventType, eventHandler){
      let eventHandlerList = this.eventHandlerListByEventType[eventType];
      if (eventHandlerList != null) {
        _eventHandlerListByEventType[eventType] = eventHandlerList.filter(x => x !== eventHandler);
      }
    };
    emit(eventType, ...eventArguments){
      let eventHandlerList = this.eventHandlerListByEventType[eventType];
      if (eventHandlerList != null) {
        for (let i = 0, n = eventHandlerList.length; i < n; i++) {
          let eventHandler = eventHandlerList[i];
          eventHandler.apply(self, eventArguments);
        }
      }
    };
  };


  class MickrClient extends EventEmitter{
    /* メンバー要素 */
    constructor(option){
      super()
      this.client = new TelepathyClient();
      this.isConnected = false;
      this.syncing = false;
      this.settings = option;
      this.contexts = {}

      this.client.on('error', event => {console.log('error', event);});
      this.client.on('close', event => {console.log('close', event);});

      /* 返信処理 */
      this.client.on('response', (req, res) => {
        // if(res.method != "ECHO") console.log('message: ');
      });

      /* 接続時の処理 */
      this.client.on('connect', event => {
        console.log('connect', event);
        this.connected()
      });

      /* メッセージを受信した時の処理 */
      this.client.on('message', message => {
        const self = this;
        if(message.body.key in self.contexts){
          console.log("responce: ", message);
          var req = self.contexts[message.body.key].message;
          var callback = self.contexts[message.body.key].callback;
          delete self.contexts[message.body.key];
          callback(req, message);
        }else{
          console.log("message: ",message);
          var response = {
            "from": message.to,
            "to": message.from,
            "body": {
              "key": message.body.key,
              "command": message.body.command,
              "content": message.body.content,
              "response": message.body.response
            }
          };
          /* message中のコマンドの実行 */
          self.emit(message.body.command, message, response);
        }
      });
      this.client.connect(this.settings.url, this.settings.site, this.settings.token);
    }

    /* 通信確認 */
    connect(callback){
      return new Promise((resolve)=>{
        if(this.isConnected){
          console.log("connected");
          if(typeof callback == 'function') callback()
          resolve()
        }
        else{
          console.log("wait");
          this.on('connect', ()=>{
            console.log("connected", callback);
            if(typeof callback == 'function') callback()
            resolve()
          })
        }
      })
    }

    /* Helloリクエストによる接続確認 */
    connected(){
      return new Promise((resolve, reject) => {
        /* 既に通信が完了しているか確認 */
        const self = this;
        if(self.isConnected) console.log("Connected");
        else{
          self.client.hello({"from": self.settings.id }, (req, res) => {
            // console.log("hello:callback", req, res);
            self.isConnected = res.status == 200;
            /* 接続があるならHelloリクエストによる確認を行う */
            if(self.isConnected){
              console.log("HELLO: " + (self.isConnected ? "OK" : "NO"));
              /* HeartBeat: 接続確認 */
              setInterval(() => {
                if(self.isConnected){
                  self.client.echo({});
                  console.log("HeartBeat");
                }else{
                  console.log("ReConnection");
                  self.client.connect(self.settings.url, self.settings.site, self.settings.token );
                }
              }, 30000);
              self.emit('connect');
              resolve();
            }
          });
        }
      })
    }


    send(command, option, callback){
      return new Promise((resolve, reject) => {
        console.log("option:",option);
        this.connect().then(()=>{
          const message = {
            "from": option.from === undefined ? this.settings.id : option.from,
            "to": option.to === undefined ? undefined : option.to,
            "body": {
              "key": option.body.key === undefined ? this.generateRandomID() : option.body.key,
              "command": command === undefined ? "test" : command,
              "content": option.body.content === undefined ? "" : option.body.content,
              "response": option.body.response === undefined ? true : option.body.response
            }
          }

          /* 送信処理 */
          this.client.send(message, (req, res) => {
            console.log("send mes", req);
            this.contexts[message.body.key] = { "message": req, callback: callback };
          });
        })
      })
    }
    /* ブロードキャスト送信 */
    broadcast(command, option, callback){
      console.log(option);
      return this.send(command, {
        "from": option.from === undefined ? this.settings.id : option.from,
        "to": undefined,
        "body": {
          "key": option.body.key === undefined ? this.generateRandomID() : option.body.key,
          "command": command === undefined ? "test" : command,
          "content": option.body.content === undefined ? "" : option.body.content,
          "response": option.body.response === undefined ? true : option.body.response
        }
      }, callback)
    };
    response(message){
      this.send(message)
    }
    generateRandomID(){
      var id = null;
      while (true) {
        id = Math.random().toString(16).slice(-8).toUpperCase();
        if (id in this.contexts == false) {
          break;
        }
      }
      return id;
    };
  };

  /* 雲を表示するベースの生成 */
  class Sky extends EventEmitter{
    constructor(option){
      super()
      option = option || {};
      this.client = null;
      this.clouds = [];
      this.selected = [];

      if(option.element !== undefined){
        this.element = option.element;
      } else if(option.elementID !== undefined){
        this.element = document.getElementById(option.elementID)
      }
      else {
        var div = document.createElement('div');
        div.id = "sky";
        div.className = 'sky';
        div.style.position = "absolute";
        div.style.left = typeof option.x === undefined ? 0 : parseInt(option.x) + "px";
        div.style.top = typeof option.y === undefined ? 0 : parseInt(option.y) + "px";
        div.style.width = option.width || "100%";
        div.style.height = option.height || "100%";
        div.style.padding = option.padding || 0;
        div.style.margin = option.margin || 0;

        document.body.appendChild(div)
        this.element = div;
      }
    }

    send(command, message, callback){if(this.client !== null) this.client.send(command, message, callback)}
    on(command, message, callback){if(this.client !== null) this.client.on(command, message, callback)}
    broadcast(command, message, callback){if(this.client !== null) this.client.broadcast(command, message, callback)}

    appendCloud(cloud){
      cloud.parent.appendChild(cloud.element)
      this.clouds.push(cloud);
    }

    /* sky上に雲の追加 */
    addCloud(option){
      if(option){
        option.parent = option.parent || this.element;
        option.mouseover = option.mouseover || this.mouseover.bind(this);
        option.mouseout = option.mouseout || this.mouseout.bind(this);
        option.onComplete = option.onComplete || this.onComplete.bind(this);
        option.onClick = option.onClick || this.onClick.bind(this);
      }

      var cloud = new Cloud(option)
      this.setID(cloud)
      cloud.createCloud(option);
      cloud.setAnimator(option)
      cloud.addHandler(option);
      cloud.option = option;
      this.appendCloud(cloud);
      return cloud;
    };

    outerPause(){
      this.clouds.forEach(cloud => {
        if(!cloud.selected){
          cloud.animator.pause('around')
        }
      });
    };

    outerResume(){
      this.clouds.forEach((cloud) => {
        if(!cloud.selected){
          cloud.animator.resume('around')
        }
      });
    };

    mouseover(cloud){};
    mouseout(cloud){};
    onComplete(cloud){this.clouds.splice(this.clouds.indexOf(cloud), 1);};

    returnClouds(){
      this.selected.forEach(c => {
        c.onClick();
        this.clouds.push(c);
      });
      this.selected = [];
    };

    onClick(cloud){
      if (!cloud.selected) {
        this.selected.push(cloud);
        this.clouds.splice(this.clouds.indexOf(cloud), 1);
        this.outerResume();
      }
      else {
        this.selected.splice(this.selected.indexOf(cloud), 1);
        this.clouds.push(cloud);
      }
      cloud.onClick()
    };

    selectedText(){return(this.selected ? this.selected.map(cloud => cloud.text) : []);};

    setID(cloud){
      var id = generateRandomID();
      // while(!this.clouds.some(c=>c.id === id)) id = generateRandomID;
      cloud.id = id;
      return id;
    }
  }

  /* 雲オブジェクトの生成 */
  class Cloud{
    constructor(option){
      option = option !== undefined ? option : {
        parent: document.getElementById('sky'),
        id: generateRandomID(),
        size: 1.0,
        tags: ["none"]
      }
      this.parent = option.parent || document.getElementById('sky');
      this.element = null;
      this.clickAnimation = () => {}

      this.visible = option.visible === undefined ? true : option.visible;
      this.colors = option.color || {};

      this.size = option.size || 1.0;
      this.tags = option.tags || ["none"];
    };

    export(){
      var ret = this.option;
      ret.text = this.text;
      ret.position = this.getPosition();
    }

    appendSky(parent){
      this.parent = parent || this.parent;
      parent.appendChild(this.element);
    };


    setAnimator(option){
      this.animator = new Animator({
        parent: this,
        element: this.element
      })
      this.animator.initAnimation(option);
    }

    isCollision(x, y){
      var rect = this.element.getBoundingClientRect();
      var X = x - rect.left;
      var Y = y - rect.top;
      var W = rect.width;
      var H = rect.height;
      return(X >= 0 && X <= W && Y >=0 && Y <= H);
    }

    createCloud(option){
      if(this.element) return 0;
      console.log(option.type)
      switch(option.type) {
        case "rect":
          console.log("rect");
          var rect = document.createElement('div');
          rect.style.position = "absolute"
          rect.style.fontSize = "x-large";
          rect.style.fontColor = "black";
          rect.style.border = 'black solid 1px'
          rect.style.backgroundColor = option.color;
          rect.style.opacity = this.visible && this.visible === undefined ? 1.0 : 0.0;
          rect.innerText = option.text;
          this.element = rect;
          this.setPosition(option.position)
          break;
        default:
          conosle.log("default")
          this.element = this.createCloudElement();
          this.setColor(option.color);
          this.setText(option.text, option.textColor);
          this.setImage(option.url);
          this.setPosition(option.position)
          this.setSize(option.size)
          break;
      }
    };

    getSize(){
      return {
        width: this.element.getBoundingClientRect().width,
        height: this.element.getBoundingClientRect().height
      }
    }

    setSize(scale, duration=0.5){
      TweenLite.to(this.element, 0, {scale: scale})
    }

    getPosition(){
      var rect = this.element.getBoundingClientRect();
      return {
        x: parseInt(rect.left),
        y: parseInt(rect.top)
      }
    }

    setPosition(position){
      position = position || {x:0, y:0};
      this.element.style.left = position.x+"px";
      this.element.style.top = position.y+"px";
    }

    setText(option){
      this.text = option.text === undefined ? "" : option.text;
      this.textColor = option.textColor === undefined ? "#000000" : option.textColor;
      this.keyword = option.keyword || option.text;
      this.keywordSize = option.keywordSize === undefined ? "100%" : option.keywordSize;
      this.textSize = option.textSize || option.keywordSize;

      this.element.querySelector('.cloud_text').innerText = this.keyword;
      this.element.querySelector('.cloud_text').style.color = this.textColor;
      this.element.querySelector('.cloud_text').style.fontSize = this.keywordSize;
    };

    setColor(color_1, color_2){
      this.colors = {
        1: color_1 || "#777777",
        2: color_2 || "#000000",
      };
      if(color_1)
        this.element.querySelector('.stop2').setAttribute("style", "stop-color: "+color_1+";");
      if(color_2)
        this.element.querySelector('.stop1').setAttribute("style", "stop-color: "+color_2+";");
    };

    setImage(image){
      if(image){
        var url = image.url;
        // var data = new Uint8Array(this.response);
        // var oURL = URL.createObjectURL(new Blob([data], { type: "image/png" }));

        if(url){
          this.element.querySelector('.cloud_image').style.display = 'block'
          this.element.querySelector('.cloud_image').src = url
        }
        else{this.element.querySelector('.cloud_image').style.display = 'none'}

      }
    }

    remove(){
      this.element.style.display = "none";
    }
    addHandler(option){
      this.element.addEventListener('mouseover', (() => {option.mouseover(this);}).bind(this), false);
      this.element.addEventListener('mouseout', (() => {option.mouseout(this);}).bind(this), false);
      this.element.addEventListener('click', (e => {this.onClick();}).bind(this), false);
    };

    onClick(){
      if (this.selected) {
        this.animator.returnOuterAround()
      }
      else{
        if(this.animator.timeline['click']) this.animator.resume('click');
        this.selected = true;
      }
    };

    getPosition(){
      this.position = {x: this.element.getBoundingClientRect().left, y: this.element.getBoundingClientRect().top};
      return this.position;
    }

    createCloudElement(option){
      var parser = new DOMParser();
      var svg = null;
      var div = document.createElement('div')
      var text = document.createElement('div')
      var _img = document.createElement('img')

      if(option === undefined){
        svg = parser.parseFromString(`<svg class="cloud" version="1.0" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0" y="0" viewBox="300 176.5 245 180" style="enable-background:new 343.523 211.385 160.252 109.403; position: absolute;" xml:space="preserve">
        <defs>
          <radialGradient id="cloud-gradient-`+this.id+`">
            <stop class="stop1" offset="0%"/>
            <stop class="stop2" offset="100%"/>
          </radialGradient>
          <filter id="cloud-filter-`+this.id+`" x="-50%" y="-50%" width="200%" height="200%">
            <feOffset result="offOut" in="SourceGraphic" dx="0" dy="0" />
            <feColorMatrix result="matrixOut" in="offOut" type="matrix"
            values="0.2 0 0 0 0 0 0.2 0 0 0 0 0 0.2 0 0 0 0 0 1 0" />
            <feGaussianBlur result="blurOut" in="matrixOut" stdDeviation="10" />
            <feBlend in="SourceGraphic" in2="blurOut" mode="normal" />
          </filter>
        </defs>
      <path class="st0" d="M491.348,254.364c0.067-0.643,0.1-1.294,0.1-1.954c0-10.53-8.537-19.068-19.068-19.068
          c-1.038,0-2.054,0.086-3.045,0.246c-1.761-6.571-7.741-11.417-14.868-11.417c-2.479,0-4.814,0.601-6.891,1.642
          c-7.422-7.661-17.812-12.428-29.319-12.428c-13.639,0-25.708,6.694-33.124,16.969c-1.776-0.51-3.65-0.789-5.59-0.789
          c-11.17,0-20.225,9.054-20.225,20.224c0,0.567,0.029,1.127,0.075,1.684c-9.136,2.431-15.869,10.757-15.869,20.659
          c0,9.252,5.879,17.131,14.105,20.108c-0.145,0.854-0.237,1.725-0.237,2.621c0,8.616,6.985,15.601,15.602,15.601
          c2.671,0,5.184-0.674,7.382-1.857c4.336,6.022,11.403,9.946,19.39,9.946c4.801,0,9.267-1.42,13.011-3.858
          c3.879,4.928,9.894,8.096,16.651,8.096c3.79,0,7.345-1,10.422-2.745c2.309,0.874,4.985,1.376,7.843,1.376
          c4.795,0,9.084-1.41,11.966-3.629c1.977,0.493,4.042,0.76,6.172,0.76c13.647,0,24.798-10.673,25.571-24.127
          c7.288-3.235,12.374-10.529,12.374-19.017C503.776,264.897,498.665,257.587,491.348,254.364z">
      </path>
    </svg>`, "image/svg+xml").firstChild;
        div.classList.add('rcmnd');
        div.setAttribute('draggable', true);
        div.setAttribute('style', "position: absolute;");
        text.className = "cloud_text flexiblebox";
        text.setAttribute("style", "position: absolute;");
        _img.className = "cloud_image flexiblebox";

        svg.querySelector('.cloud path').setAttribute('style', `position: absolute; fill: url('#cloud-gradient-`+this.id+`'); filter: url('#cloud-filter-`+this.id+`');`)

        div.appendChild(svg)
        div.appendChild(_img)
        div.appendChild(text)
        console.log("svg", svg);
      }
      else{
        var svg_div = document.createElement('div');
        svg_div.className = "canvas"
        svg_div.style.position = "absolute";
        svg_div.style.width = "200px";
        svg_div.style.height = "200px";
        div.setAttribute('draggable', true);
        div.setAttribute('style', "position: absolute;");
        text.className = "cloud_text flexiblebox";
        text.setAttribute("style", "position: absolute;");
        _img.className = "cloud_image flexiblebox";

        svg_div.insertAdjacentHTML('afterbegin', option);
        div.appendChild(svg_div)
        div.appendChild(_img)
        div.appendChild(text)
      }
      return div;
    }
  }

  class Animator extends EventEmitter{
    constructor(option){
      super()
      this.parent = option.parent || {};
      this.state = 'init';
      this.element = option.element || document.createElement('div');
      this.animations = {};
      this.animationHandler = {}
      this.timeline = {};
      this.w = window.w;
      this.h = window.h;
    }

    initAnimation(op){
      const self = this;
      this.animations = {
        zero: () => {
          var tl = new TimelineLite();
          tl.add([TweenLite.to(self.element, 0.5, {scale: 1.0, x: 0, y: 0})])
          return tl
        },
        expand: (ratio, duration=0.5) => {
          var tl = new TimelineLite();
          ratio = ratio === undefined ? 2.5 : ratio;
          tl.add([TweenLite.to(self.element, 0.5, {scale: 2.5})])
          return tl
        },
        /* 振動 */
        swing: (option) => {
          var tl = new TimelineLite();

          var params = {
            yoyo: true,
            repeat: 1,
            ease: Sine.easeOut,
            transformOrigin: 'initial'
          };

          for (var i = 0; i < option.interval; i++) {
            var forward_params = JSON.parse(JSON.stringify(params));
            forward_params[option.direction] = "+=" + (Math.random() * option.range + 3);
            tl.add(TweenMax.to(self.element, (option.duration / 4) / option.interval, forward_params));
            var backward_params = JSON.parse(JSON.stringify(params));
            backward_params[option.direction] = "-=" + (Math.random() * option.range + 3);
            tl.add(TweenMax.to(self.element, (option.duration / 4) / option.interval, backward_params));
          }

          return tl;
        },

        /* 右へ外回り移動 */
        Right: (option) => {
          var tl = new TimelineLite();
          var animations = [TweenLite.to(self.element, option.duration, {
              x: this.w,
              xPercent: -150,
              ease: Sine.easeInOut,
              onComplete: (() => {
                self.state = 'Down';
                if (option.onComplete) option.onComplete();
              }).bind(self)
            })];
          if (option.rotation) animations.push(TweenLite.to(self.element, option.duration, {rotation: '-135'}));
          if (option.swing) animations.push(self.animations["swing"]({duration: option.duration, interval: 10, range: 5, direction: 'top'}));

          tl.add(animations);

          return tl;
        },

        Down: (option) => {
          var tl = new TimelineLite();

          var animations = [TweenLite.to(self.element, option.duration, {
              y: self.h,
              yPercent: -150,
              ease: Sine.easeInOut,
              onComplete: () => {
                self.state = 'Left';
                if(option.onComplete) option.onComplete();
              }
            })];
          if (option.rotation) animations.push(TweenLite.to(self.element, option.duration, {rotation: '-45'}));
          if (option.swing) animations.push(self.animations["swing"]({duration: option.duration, interval: 10, range: 5, direction: 'left'}));

          tl.add(animations);

          return tl;
        },

        /* 左へ外回り移動 */
        Left: (option) => {
          var tl = new TimelineLite();

          var animations = [TweenLite.to(self.element, option.duration, {
              x: 0,
              xPercent: 50,
              ease: Sine.easeInOut,
              onComplete: () => {
                self.state = 'Up';
                if (option.onComplete) option.onComplete();
              }
            })];
          if (option.rotation) animations.push(TweenLite.to(self.element, option.duration, {rotation: '45'}));
          if (option.swing) animations.push(self.animations["swing"]({duration: option.duration, interval: 10, range: 5, direction: 'top'}));

          tl.add(animations);

          return tl;
        },

        /* 上へ外回り移動 */
        Up: (option) => {
          var tl = new TimelineLite();

          var animations = [TweenLite.to(self.element, option.duration, {
              y: 0,
              yPercent: 50,
              ease: Sine.easeInOut,
              onComplete: () => {
                self.state = 'Done';
                if(option.onComplete) option.onComplete();
              }
            })];
          if(option.rotation) animations.push(TweenLite.to(self.element, option.duration, {rotation: '135'}));
          if(option.swing) animations.push(self.animations["swing"]({duration: option.duration, interval: 10, range: 5, direction: 'left'}));

          tl.add(animations);

          return tl;
        },

        to: (position={x:0, y:0}, duration=2) => {
          var tl = new TimelineLite();
          tl.add([TweenLite.to(self.element, duration, {left: position.x, top: position.y})])
          return tl
        },
        fromTo: (start={x:0, y:0}, end={x:0, y:0}, duration=2) => TweenLite.fromTo(self.element, duration, {left: start.x, top: start.y}, {left: end.x, top: end.y}),
        rotate: (angle=0, duration=2) => TweenLite.to(self.element, duration, {rotation: angle,}),
        fadeIn: (duration=2 ,alpha=1.0) => TweenLite.to(self.element, duration, {alpha:alpha}),
        fadeOut:(duration=2) => TweenLite.to(self.element, duration, {alpha:alpha}),

        Around: (start={x: 0, y:0}, end={x:0, y:0}, swing=true, rotation=true) => {
          var tl = new TimelineLite({onComplete: onComplete, onUpdateParams: ["{self}"]});
          tl.add(TweenLite.fromTo(self.element, 2, {
            rotation: 0,
            xPercent: 0,
            yPercent: 0,
            x: start.x,
            y: start.y
          }, {
            rotation: rotation
              ? -235
              : 0,
            xPercent: 50,
            yPercent: 50,
            y: 0,
            onComplete: (() => {self.state = 'Right';}).bind(self)
          }));

          tl.add('Around');
          tl.add('Right');
          tl.add(this.animations['Right']({duration:  option.position ? 9 * ((this.w - option.position.x) / this.w) : 9, swing: option.swing_right, rotation: option.rotation}));
          tl.add('Down');
          tl.add(this.animations['Down']({duration: 8, swing: option.swing, rotation: option.rotation}));
          tl.add('Left');
          tl.add(this.animations['Left']({duration: 9, swing: option.swing, rotation: option.rotation}));
          tl.add('Up');
          tl.add(this.animations['Up']({duration: 8, swing: option.swing, rotation: option.otation}));
          tl.add(TweenLite.fromTo(self.element, 2, {rotation: 0, xPercent: 0, yPercent: 0, left: end.x, top: end.y}));
          tl.add('Done');

          return tl;
        },
        returnOuterAround: () => {
          var tl = new TimelineLite();
          tl.add(TweenLite.to(this.element, 0.5, {scale: 1.0}))
          switch (this.state) {
            case 'Right':
              this.animations['Right']({
                duration: 1.0,
                rotation: this.rotation,
                swing: false,
                onComplete: () => {
                  this.selected = false;
                  this.timeline['around'].seek('Down').resume();
                }
              }
            );
              break;
            case 'Down':
              this.animations['Down']({
                duration: 1.0,
                rotation: this.rotation,
                swing: false,
                onComplete: () => {
                  this.selected = false;
                  TweenLite.to(this.element, 2, {scale: 1})
                  this.timeline['around'].seek('Left').resume();
                }
              });
              break;
            case 'Left':
              this.animations['Left']({
                duration: 1.0,
                rotation: this.rotation,
                swing: false,
                onComplete: () => {
                  this.selected = false;
                  TweenLite.to(this.element, 2, {scale: 1})
                  this.timeline['around'].seek('Up').resume();
                }
              });
              break;
            case 'Up':
              this.animations['Up']({
                duration: 1.0,
                rotation: this.rotation,
                swing: false,
                onComplete: () => {
                  this.selected = false;
                  TweenLite.to(this.element, 2, {scale: 1})
                  this.timeline['around'].seek('Done').resume();
                }
              });
              break;
          }
        },
        centering: (position, ratio=3.0, duration=2.0) => {
          var tl = new TimelineLite();
          position = position || {x: this.w/2 - 100, y: this.h/2 - 100};
          position.x = position.x || this.w/2 - 100;
          position.y = position.y || this.h/2 - 100;
          var animations = [TweenLite.to(self.element, 2, {
            rotation: 0,
            xPercent: 0,
            yPercent: 0,
            x: position.x,
            y: position.y
          }), TweenLite.to(self.element, 2, {
            scale: 3.0
          })];
          tl.add(animations);
          return tl;
        }
      };
    }

    addAnimation(name, animation, callback){
      const self = this;
      console.log(name, animation);
      self.animationHandler[name] = {
        name: name,
        func: self.animations[animation.name],
        option: animation.option
      }
      this.on(name, function(){
        console.log(this, self.animationHandler);
        self.animationHandler[name].func(self.animationHandler[name].option).bind(self)
      })
    }

    pause(name){if(this.timeline[name]) this.timeline[name].pause()}
    resume(name){if(this.timeline[name]) this.timeline[name].resume()}
    start(name){if(this.timeline[name]) this.timeline[name].start()}
    pauseAll(){Object.keys(this.timeline).forEach(k => this.pause(k))}
    resumeAll(){Object.keys(this.timeline).forEach(k => this.resume(k))}
    startAll(){Object.keys(this.timeline).forEach(k => this.start(k))}

    addGoAround(option){
      option["onUpdate"] = (tl => {this.now = tl.totalTime();}).bind(this)
      this.timeline['around'] = this.goAround(option)
    };

    goAround(option){
      var tl = new TimelineLite({onComplete: option.onComplete.bind(this.parent), onUpdate: option.onUpdate, onUpdateParams: ["{self}"]});
      var count = 0;
      option.lap = option.lap === undefined ? 1 : option.lap;
      option.start = option.start || "A";
      option.end = option.end || "A";
      this.aroundDirection = option.aroundDirection === undefined ? true : option.aroundDirection;

      switch(option.start){
        case "A":
          tl.add(TweenLite.to(option.element, 0, {x: -this.x, y: -this.y}));
          this.state = this.aroundDirection ? "Right" : "Down";
          break;
        case "B":
          tl.add(TweenLite.to(option.element, 0, {x: this.w, y: 0}));
          this.state = this.aroundDirection ? "Down" : "Left";
          break;
        case "C":
          tl.add(TweenLite.to(option.element, 0, {x: this.w, y: this.h}));
          this.state = this.aroundDirection ? "Left" : "Up";
          break;
        case "D":
          tl.add(TweenLite.to(option.element, 0, {x: 0, y: this.h}));
          this.state = this.aroundDirection ? "Up" : "Right";
          break;
      }

      tl.add('Around');
      if(option.lap > 0){
        if(this.aroundDirection){
          while(count < option.lap){
            switch(option.start){
              case "A":
                tl.add('Right');
                tl.add(this.animations['Right']({duration: 9, swing: option.swing, rotation: option.rotation}));
                tl.add('Down');
                tl.add(this.animations['Down']({duration: 8, swing: option.swing, rotation: option.rotation}));
                tl.add('Left');
                tl.add(this.animations['Left']({duration: 9, swing: option.swing, rotation: option.rotation}));
                tl.add('Up');
                tl.add(this.animations['Up']({duration: 8, swing: option.swing, rotation: option.otation}));
                count++;
                break;
              case "B":
                tl.add('Down');
                tl.add(this.animations['Down']({duration: 8, swing: option.swing, rotation: option.rotation}));
                tl.add('Left');
                tl.add(this.animations['Left']({duration: 9, swing: option.swing, rotation: option.rotation}));
                tl.add('Up');
                tl.add(this.animations['Up']({duration: 8, swing: option.swing, rotation: option.otation}));
                tl.add('Right');
                tl.add(this.animations['Right']({duration: 9, swing: option.swing, rotation: option.rotation}));
                count++;
                break;
              case "C":
                tl.add('Left');
                tl.add(this.animations['Left']({duration: 9, swing: option.swing, rotation: option.rotation}));
                tl.add('Up');
                tl.add(this.animations['Up']({duration: 8, swing: option.swing, rotation: option.otation}));
                tl.add('Right');
                tl.add(this.animations['Right']({duration: 9, swing: option.swing, rotation: option.rotation}));
                tl.add('Down');
                tl.add(this.animations['Down']({duration: 8, swing: option.swing, rotation: option.rotation}));
                count++;
                break;
              case "D":
                tl.add('Up');
                tl.add(this.animations['Up']({duration: 8, swing: option.swing, rotation: option.otation}));
                tl.add('Right');
                tl.add(this.animations['Right']({duration: 9, swing: option.swing, rotation: option.rotation}));
                tl.add('Down');
                tl.add(this.animations['Down']({duration: 8, swing: option.swing, rotation: option.rotation}));
                tl.add('Left');
                tl.add(this.animations['Left']({duration: 9, swing: option.swing, rotation: option.rotation}));
                count++;
                break;
            }
          }
        }else{
          while(count < option.lap){
            switch(option.start){
              case "A":
                tl.add('Down');
                tl.add(this.animations['Down']({duration: 8, swing: option.swing, rotation: option.rotation}));
                tl.add('Right');
                tl.add(this.animations['Right']({duration: 9, swing: option.swing, rotation: option.rotation}));
                tl.add('Up');
                tl.add(this.animations['Up']({duration: 8, swing: option.swing, rotation: option.otation}));
                tl.add('Left');
                tl.add(this.animations['Left']({duration: 9, swing: option.swing, rotation: option.rotation}));
                count++;
                break;
              case "D":
                tl.add('Right');
                tl.add(this.animations['Right']({duration: 9, swing: option.swing, rotation: option.rotation}));
                tl.add('Up');
                tl.add(this.animations['Up']({duration: 8, swing: option.swing, rotation: option.otation}));
                tl.add('Left');
                tl.add(this.animations['Left']({duration: 9, swing: option.swing, rotation: option.rotation}));
                tl.add('Down');
                tl.add(this.animations['Down']({duration: 8, swing: option.swing, rotation: option.rotation}));
                count++;
                break;
              case "C":
                tl.add('Up');
                tl.add(this.animations['Up']({duration: 8, swing: option.swing, rotation: option.otation}));
                tl.add('Left');
                tl.add(this.animations['Left']({duration: 9, swing: option.swing, rotation: option.rotation}));
                tl.add('Down');
                tl.add(this.animations['Down']({duration: 8, swing: option.swing, rotation: option.rotation}));
                tl.add('Right');
                tl.add(this.animations['Right']({duration: 9, swing: option.swing, rotation: option.rotation}));
                count++;
                break;
              case "B":
                tl.add('Left');
                tl.add(this.animations['Left']({duration: 9, swing: option.swing, rotation: option.rotation}));
                tl.add('Down');
                tl.add(this.animations['Down']({duration: 8, swing: option.swing, rotation: option.rotation}));
                tl.add('Right');
                tl.add(this.animations['Right']({duration: 9, swing: option.swing, rotation: option.rotation}));
                tl.add('Up');
                tl.add(this.animations['Up']({duration: 8, swing: option.swing, rotation: option.otation}));
                count++;
                break;
            }
          }
        }
      }
      if(this.aroundDirection){
        switch(option.start){
          case "A":
            if(option.end == "A"){
              tl.add('Done');
              break;
            }
            tl.add('Right');
            tl.add(this.animations['Right']({duration: 9, swing: option.swing, rotation: option.rotation}));
            if(option.end == "B"){
              tl.add('Done');
              break;
            }
            tl.add('Down');
            tl.add(this.animations['Down']({duration: 8, swing: option.swing, rotation: option.rotation}));
            if(option.end == "C"){
              tl.add('Done');
              break;
            }
            tl.add('Left');
            tl.add(this.animations['Left']({duration: 9, swing: option.swing, rotation: option.rotation}));
            if(option.end == "D"){
              tl.add('Done');
              break;
            }
            tl.add('Up');
            tl.add(this.animations['Up']({duration: 9, swing: option.swing, rotation: option.rotation}));
            tl.add('Done');
            break;
          case "B":
            if(option.end == "B"){
              tl.add('Done');
              break;
            }
            tl.add('Down');
            tl.add(this.animations['Down']({duration: 8, swing: option.swing, rotation: option.rotation}));
            if(option.end == "C"){
              tl.add('Done');
              break;
            }
            tl.add('Left');
            tl.add(this.animations['Left']({duration: 9, swing: option.swing, rotation: option.rotation}));
            if(option.end == "D"){
              tl.add('Done');
              break;
            }
            tl.add('Up');
            tl.add(this.animations['Up']({duration: 9, swing: option.swing, rotation: option.rotation}));
            if(option.end == "A"){
              tl.add('Done');
              break;
            }
            tl.add('Right');
            tl.add(this.animations['Right']({duration: 9, swing: option.swing, rotation: option.rotation}));
            tl.add('Done');
            break;
          case "C":
            if(option.end == "C"){
              tl.add('Done');
              break;
            }
            tl.add('Left');
            tl.add(this.animations['Left']({duration: 9, swing: option.swing, rotation: option.rotation}));
            if(option.end == "D"){
              tl.add('Done');
              break;
            }
            tl.add('Up');
            tl.add(this.animations['Up']({duration: 9, swing: option.swing, rotation: option.rotation}));
            if(option.end == "A"){
              tl.add('Done');
              break;
            }
            tl.add('Right');
            tl.add(this.animations['Right']({duration: 9, swing: option.swing, rotation: option.rotation}));
            if(option.end == "B"){
              tl.add('Done');
              break;
            }
            tl.add('Down');
            tl.add(this.animations['Down']({duration: 8, swing: option.swing, rotation: option.rotation}));
            tl.add('Done');
            break;
          case "D":
            if(option.end == "D"){
              tl.add('Done');
              break;
            }
            tl.add('Up');
            tl.add(this.animations['Up']({duration: 9, swing: option.swing, rotation: option.rotation}));
            if(option.end == "A"){
              tl.add('Done');
              break;
            }
            tl.add('Right');
            tl.add(this.animations['Right']({duration: 9, swing: option.swing, rotation: option.rotation}));
            if(option.end == "B"){
              tl.add('Done');
              break;
            }
            tl.add('Down');
            tl.add(this.animations['Down']({duration: 8, swing: option.swing, rotation: option.rotation}));
            if(option.end == "C"){
              tl.add('Done');
              break;
            }
            tl.add('Left');
            tl.add(this.animations['Left']({duration: 9, swing: option.swing, rotation: option.rotation}));
            tl.add('Done');
            break;
        }
      }
      else{
        switch(option.start){
          case "A":
            if(option.end == "A"){
              tl.add('Done');
              break;
            }
            tl.add('Down');
            tl.add(this.animations['Down']({duration: 8, swing: option.swing, rotation: option.rotation}));
            if(option.end == "D"){
              tl.add('Done');
              break;
            }
            tl.add('Right');
            tl.add(this.animations['Right']({duration: 9, swing: option.swing, rotation: option.rotation}));
            if(option.end == "C"){
              tl.add('Done');
              break;
            }
            tl.add('Up');
            tl.add(this.animations['Up']({duration: 9, swing: option.swing, rotation: option.rotation}));
            if(option.end == "B"){
              tl.add('Done');
              break;
            }
            tl.add('Left');
            tl.add(this.animations['Left']({duration: 9, swing: option.swing, rotation: option.rotation}));
            tl.add('Done');
            break;
          case "D":
            if(option.end == "D"){
              tl.add('Done');
              break;
            }
            tl.add('Right');
            tl.add(this.animations['Right']({duration: 9, swing: option.swing, rotation: option.rotation}));
            if(option.end == "C"){
              tl.add('Done');
              break;
            }
            tl.add('Up');
            tl.add(this.animations['Up']({duration: 9, swing: option.swing, rotation: option.rotation}));
            if(option.end == "B"){
              tl.add('Done');
              break;
            }
            tl.add('Left');
            tl.add(this.animations['Left']({duration: 9, swing: option.swing, rotation: option.rotation}));
            if(option.end == "A"){
              tl.add('Done');
              break;
            }
            tl.add('Down');
            tl.add(this.animations['Down']({duration: 8, swing: option.swing, rotation: option.rotation}));
            tl.add('Done');
            break;
          case "C":
            if(option.end == "C"){
              tl.add('Done');
              break;
            }
            tl.add('Up');
            tl.add(this.animations['Up']({duration: 9, swing: option.swing, rotation: option.rotation}));
            if(option.end == "B"){
              tl.add('Done');
              break;
            }
            tl.add('Left');
            tl.add(this.animations['Left']({duration: 9, swing: option.swing, rotation: option.rotation}));
            if(option.end == "A"){
              tl.add('Done');
              break;
            }
            tl.add('Down');
            tl.add(this.animations['Down']({duration: 8, swing: option.swing, rotation: option.rotation}));
            if(option.end == "D"){
              tl.add('Done');
              break;
            }
            tl.add('Right');
            tl.add(this.animations['Right']({duration: 9, swing: option.swing, rotation: option.rotation}));
            tl.add('Done');
            break;
          case "B":
            if(option.end == "B"){
              tl.add('Done');
              break;
            }
            tl.add('Left');
            tl.add(this.animations['Left']({duration: 9, swing: option.swing, rotation: option.rotation}));
            if(option.end == "A"){
              tl.add('Done');
              break;
            }
            tl.add('Down');
            tl.add(this.animations['Down']({duration: 8, swing: option.swing, rotation: option.rotation}));
            if(option.end == "D"){
              tl.add('Done');
              break;
            }
            tl.add('Right');
            tl.add(this.animations['Right']({duration: 9, swing: option.swing, rotation: option.rotation}));
            if(option.end == "C"){
              tl.add('Done');
              break;
            }
            tl.add('Up');
            tl.add(this.animations['Up']({duration: 9, swing: option.swing, rotation: option.rotation}));
            tl.add('Done');
            break;
        }
      }

      console.log(tl);

      return tl;
    };

    goAroundSmall(center, r){
      var tl = new TimelineLite({
        onComplete: self => {self.restart();},
        onCompleteParams: ["{self}"],
        repeat: -1
      });
      tl.add('goAroundSmall');
      tl.add(TweenLite.to(this.element, 2, {
        x: this.w / 2,
        y: this.h / 2 + 200,
        rotation: 720,
        xPercent: "-50%",
        yPercent: "-50%"
      }));
      var tl_around = new TimelineMax({repeat: -1});
      tl_around.add(TweenMax.to(this.element, 2, {
        xPercent: "-=130",
        yoyo: true,
        repeat: 1,
        ease: Sine.easeOut
      }));
      tl_around.add(TweenMax.to(this.element, 2, {
        xPercent: "+=130",
        yoyo: true,
        repeat: 1,
        ease: Sine.easeOut
      }));
      tl.add([
        TweenMax.to(this.element, 8, {
          rotation: 1080,
          ease: Linear.easeNone,
          repeat: -1
        }),
        TweenMax.to(this.element, 4, {
          yPercent: "-=390",
          yoyo: true,
          repeat: -1,
          ease: Sine.easeInOut
        }),
        tl_around
      ]);
      return tl;
    };

    returnOuterAround(){
      var tl = new TimelineLite();
      tl.add(TweenLite.to(this.element, 0.5, {scale: 1.0}))
      if(this.aroundDirection){
        console.log(this.state);
        switch (this.state) {
          case 'Right':
            console.log("Right");
            this.animations['Right']({
              duration: 1.0,
              rotation: this.rotation,
              swing: false,
              onComplete: () => {
                this.selected = false;
                this.timeline['around'].seek('Down').resume();
              }
            }
          );
            break;
          case 'Down':
            this.animations['Down']({
              duration: 1.0,
              rotation: this.rotation,
              swing: false,
              onComplete: () => {
                this.selected = false;
                TweenLite.to(this.element, 2, {scale: 1})
                this.timeline['around'].seek('Left').resume();
              }
            });
            break;
          case 'Left':
            this.animations['Left']({
              duration: 1.0,
              rotation: this.rotation,
              swing: false,
              onComplete: () => {
                this.selected = false;
                TweenLite.to(this.element, 2, {scale: 1})
                this.timeline['around'].seek('Up').resume();
              }
            });
            break;
          case 'Up':
            this.animations['Up']({
              duration: 1.0,
              rotation: this.rotation,
              swing: false,
              onComplete: () => {
                this.selected = false;
                TweenLite.to(this.element, 2, {scale: 1})
                this.timeline['around'].seek('Done').resume();
              }
            });
            break;
        }
      }else{
        switch(this.state) {
          case 'Right':
            this.animations['Right']({
              duration: 1.0,
              rotation: this.rotation,
              swing: false,
              onComplete: () => {
                this.selected = false;
                this.timeline['around'].seek('Up').resume();
              }
            }
          );
            break;
          case 'Down':
            this.animations['Down']({
              duration: 1.0,
              rotation: this.rotation,
              swing: false,
              onComplete: () => {
                this.selected = false;
                TweenLite.to(this.element, 2, {scale: 1})
                this.timeline['around'].seek('Right').resume();
              }
            });
            break;
          case 'Left':
            this.animations['Left']({
              duration: 1.0,
              rotation: this.rotation,
              swing: false,
              onComplete: () => {
                this.selected = false;
                TweenLite.to(this.element, 2, {scale: 1})
                this.timeline['around'].seek('Down').resume();
              }
            });
            break;
          case 'Up':
            this.animations['Up']({
              duration: 1.0,
              rotation: this.rotation,
              swing: false,
              onComplete: () => {
                this.selected = false;
                TweenLite.to(this.element, 2, {scale: 1})
                this.timeline['around'].seek('Left').resume();
              }
            });
            break;
        }
      }
    };
  }

  class MickrSky extends Sky{
    constructor(option){
      option = option || {};
      super(option)
      this.pausing = false
      document.body.style.backgroundColor = 'transparent'
      // iwasato仕様
      if(option.client){
        option.id = option.id || generateRandomID();
        option.url = "ws://apps.wisdomweb.net:64260/ws/mik";
        option.site = option.site || "test";
        option.token = option.token || "Pad:9948";
        this.client = new MickrClient(option);
        console.log(this.client);
      }

      if(isNode) this.setRendererEvent()
    }

    /* sky上に雲の追加 */
    addCloud(option){
      if(option){
        option.parent = option.parent || document.getElementById('sky');
        option.mouseover = option.mouseover || this.mouseover.bind(this);
        option.mouseout = option.mouseout || this.mouseout.bind(this);
        option.onComplete = option.onComplete || this.onComplete.bind(this);
        option.onClick = option.onClick || this.onClick.bind(this);
        option.swing = option.swing === undefined ? true : option.swing;
        option.rotation = option.rotation === undefined ? false : option.rotation;
        option.around = option.around === undefined ? true : option.around;
        option.visible = option.visible === undefined ? true : option.visible;
        option.random = option.random === undefined ? true : option.random;
        option.immortal = option.immortal === undefined ? false : option.immortal;
      }

      var cloud = new MickrCloud(option)
      this.setID(cloud)

      // iwasato仕様
      option.onComplete = ()=>{
        cloud.remove()
        this.onComplete(cloud)
      }

      cloud.createCloud(option)
      cloud.setAnimation(option)
      cloud.addHandler(option)
      this.appendCloud(cloud);
      return cloud;
    };

    setRendererEvent(){
      ipcRenderer.on('mouse', (e, p) => {
        var f = this.clouds.some(c=>c.isCollision(p.x, p.y));
        if(f){
          ipcRenderer.send('collision', {
            transparent_mode: false
          });
        }
        else{
          ipcRenderer.send('collision', {
            transparent_mode: true
          });
        }
      });

      ipcRenderer.on('mickr', (e, data) => {
        this.addCloud(data)
      });
      ipcRenderer.on('switch_mode', (e, transparent_mode) => {
        if(transparent_mode) {
          document.body.style.backgroundColor = 'transparent';
        } else {
          document.body.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        }
      });
      ipcRenderer.on('switch_pause', (e, pause) => {
        this.pausing = pause
        if(pause) {
          this.clouds.forEach((cloud)=>{
            cloud.animator.pauseAll()
          })
        } else {
          this.clouds.forEach((cloud)=>{
            cloud.animator.resumeAll()
          })
        }
      });
    }
  }

  class MickrCloud extends Cloud{
    constructor(option){
      super(option)
      option.parent = option.parent || this.parent;
      option.color = option.color || "#FFFFFF";
      option.calibration = option.calibration || {
        x: -150,
        y: -150,
        w: 300,
        h: 300
      };
    }

    createCloud(option){
      this.element = this.createCloudElement(option.svg);
      this.setColor(option.color);
      // this.setText(option);
      // this.setImage(option.image);
      this.setText({text: ""})
      this.setImage({url: './img/content.png'})
      this.setPosition({x: option.calibration.x, y: option.calibration.y})
      this.setSize(option.size)
    }

    addAnimation(name, method){
      console.log("a",name, method);
      if(this.animator) this.animator.addAnimation(name, method)
      else console.error("Animator is not defined");
    }

    setAnimation(option){
      this.setAnimator(option)
      this.animator.x = option.calibration.x;
      this.animator.y = option.calibration.y;
      this.animator.w += option.calibration.w;
      this.animator.h += option.calibration.h;
      option['onComplete'] = option['onComplete'] || this.remove;
      option.element = this.element;
      if(option.around){this.animator.addGoAround(option);}
      else {
        // Draggable.create(this.element, {type:"x,y", edgeResistance:0.65, throwProps:true})
        if(option.x !== undefined && option.y !== undefined){
          this.setPosition(option.x, option.y)
        }else{
          this.setPosition(generateRandomInt(0, this.w-150), generateRandomInt(0, h-150));
        }
        if(!option.immortal){setTimeout(() => {this.remove()}, 10000)}
      }
      this.option = option;

      // this.addAnimation('start', option.onStart === undefined ? ()=>{} : option.onStart.bind(this.animator))
      // this.addAnimation('end', option.onEnd === undefined ? ()=>{} : option.onEnd.bind(this.animator))
      // this.addAnimation('click', option.onClick === undefined ? {
      //   name: 'centering',
      //   option: {}
      // } : option.onClick)
      // this.addAnimation('clicked', option.onClick === undefined ? {
      //   name: 'returnOuterAround',
      //   option: {}
      // } : option.onClick)

      this.animator.animations['click'] = this.animator.animations['centering'].bind(this.animator);
      this.animator.animations['clicked'] = this.animator.returnOuterAround.bind(this.animator);
    }

    onClick(){
      console.log("click");
      if (this.selected) {
        this.animator.pause('click')
        this.animator.animations['clicked']()
        this.element.querySelector('.cloud_text').innerText = "";
        this.element.querySelector('.cloud_text').innerText = this.keyword;
        this.element.querySelector('.cloud_text').style.fontSize = this.keywordSize;
        this.selected = false;
      }
      else{
        this.animator.pause('around')
        this.animator.timeline['click'] = this.animator.animations['click']()
        this.element.querySelector('.cloud_text').innerText = "";
        this.element.querySelector('.cloud_text').innerText = this.text;
        this.element.querySelector('.cloud_text').style.fontSize = this.textSize;
        this.selected = true;
      }
    }
  }
})();
