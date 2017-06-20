"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

(function () {
  // Node.js で動作しているか
  var isNode = typeof process !== "undefined" && typeof require !== "undefined";
  var ipcRenderer = null;
  var capture = null;

  if (isNode) window.electron = require('electron');
  var w = window.innerWidth;
  var h = window.innerHeight;
  /* ランダムなID(文字列)の生成 */
  var generateRandomID = function generateRandomID() {
    return String(Math.random().toString(36).slice(-8));
  };
  /* ランダムな整数の生成 */
  var generateRandomInt = function generateRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (isNode) {
      ipcRenderer = electron.ipcRenderer;
      capture = electron.desktopCapturer;
    }
    window.Sky = Sky;
    window.Cloud = Cloud;
    window.MickrSky = MickrSky;
    window.MickrCloud = MickrCloud;
    window.MickrClient = MickrClient;
  });

  /*
  EventEmitter.js
  yusuken@toralab.org
  */

  var EventEmitter = function (_Object) {
    _inherits(EventEmitter, _Object);

    function EventEmitter() {
      _classCallCheck(this, EventEmitter);

      var _this = _possibleConstructorReturn(this, (EventEmitter.__proto__ || Object.getPrototypeOf(EventEmitter)).call(this));

      _this.eventHandlerListByEventType = {};
      _this.eventTypeList = [];
      _this.eventHandlerListList = [];
      return _this;
    }

    _createClass(EventEmitter, [{
      key: "on",
      value: function on(eventType, eventHandler) {
        var eventHandlerList = this.eventHandlerListByEventType[eventType];
        if (eventHandlerList == null) {
          eventHandlerList = [];
          this.eventHandlerListByEventType[eventType] = eventHandlerList;
        }
        eventHandlerList.push(eventHandler);
      }
    }, {
      key: "off",
      value: function off(eventType, eventHandler) {
        var eventHandlerList = this.eventHandlerListByEventType[eventType];
        if (eventHandlerList != null) {
          _eventHandlerListByEventType[eventType] = eventHandlerList.filter(function (x) {
            return x !== eventHandler;
          });
        }
      }
    }, {
      key: "emit",
      value: function emit(eventType) {
        var eventHandlerList = this.eventHandlerListByEventType[eventType];
        if (eventHandlerList != null) {
          for (var _len = arguments.length, eventArguments = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            eventArguments[_key - 1] = arguments[_key];
          }

          for (var i = 0, n = eventHandlerList.length; i < n; i++) {
            var eventHandler = eventHandlerList[i];
            eventHandler.apply(self, eventArguments);
          }
        }
      }
    }]);

    return EventEmitter;
  }(Object);

  ;

  var MickrClient = function (_EventEmitter) {
    _inherits(MickrClient, _EventEmitter);

    /* メンバー要素 */
    function MickrClient(option) {
      _classCallCheck(this, MickrClient);

      console.log(option);

      var _this2 = _possibleConstructorReturn(this, (MickrClient.__proto__ || Object.getPrototypeOf(MickrClient)).call(this));

      _this2.client = new TelepathyClient();
      _this2.isConnected = false;
      _this2.syncing = false;
      _this2.settings = option;
      _this2.contexts = {};

      _this2.client.on('error', function (event) {
        console.log('error', event);
      });
      _this2.client.on('close', function (event) {
        console.log('close', event);
      });

      /* 返信処理 */
      _this2.client.on('response', function (req, res) {
        // if(res.method != "ECHO") console.log('message: ');
      });

      /* 接続時の処理 */
      _this2.client.on('connect', function (event) {
        console.log('connect', event);
        _this2.connected();
      });

      /* メッセージを受信した時の処理 */
      _this2.client.on('message', function (message) {
        var self = _this2;
        if (message.body.key in self.contexts) {
          console.log("responce: ", message);
          var req = self.contexts[message.body.key].message;
          var callback = self.contexts[message.body.key].callback;
          delete self.contexts[message.body.key];
          callback(req, message);
        } else {
          console.log("message: ", message);
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
      _this2.client.connect(_this2.settings.url, _this2.settings.site, _this2.settings.token);
      return _this2;
    }

    /* 通信確認 */


    _createClass(MickrClient, [{
      key: "connect",
      value: function connect(callback) {
        var _this3 = this;

        return new Promise(function (resolve) {
          if (_this3.isConnected) {
            console.log("connected");
            if (typeof callback == 'function') callback();
            resolve();
          } else {
            console.log("wait");
            _this3.on('connect', function () {
              console.log("connected", callback);
              if (typeof callback == 'function') callback();
              resolve();
            });
          }
        });
      }

      /* Helloリクエストによる接続確認 */

    }, {
      key: "connected",
      value: function connected() {
        var _this4 = this;

        return new Promise(function (resolve, reject) {
          /* 既に通信が完了しているか確認 */
          var self = _this4;
          if (self.isConnected) console.log("Connected");else {
            self.client.hello({ "from": self.settings.id }, function (req, res) {
              // console.log("hello:callback", req, res);
              self.isConnected = res.status == 200;
              /* 接続があるならHelloリクエストによる確認を行う */
              if (self.isConnected) {
                console.log("HELLO: " + (self.isConnected ? "OK" : "NO"));
                /* HeartBeat: 接続確認 */
                setInterval(function () {
                  if (self.isConnected) {
                    self.client.echo({});
                    console.log("HeartBeat");
                  } else {
                    console.log("ReConnection");
                    self.client.connect(self.settings.url, self.settings.site, self.settings.token);
                  }
                }, 30000);
                self.emit('connect');
                resolve();
              }
            });
          }
        });
      }
    }, {
      key: "send",
      value: function send(command, option, callback) {
        var _this5 = this;

        return new Promise(function (resolve, reject) {
          console.log("option:", option);
          _this5.connect().then(function () {
            var message = {
              "from": option.from === undefined ? _this5.settings.id : option.from,
              "to": option.to === undefined ? undefined : option.to,
              "body": {
                "key": option.body.key === undefined ? _this5.generateRandomID() : option.body.key,
                "command": command === undefined ? "test" : command,
                "content": option.body.content === undefined ? "" : option.body.content,
                "response": option.body.response === undefined ? true : option.body.response
              }
            };

            /* 送信処理 */
            _this5.client.send(message, function (req, res) {
              console.log("send mes", req);
              _this5.contexts[message.body.key] = { "message": req, callback: callback };
            });
          });
        });
      }
      /* ブロードキャスト送信 */

    }, {
      key: "broadcast",
      value: function broadcast(command, option, callback) {
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
        }, callback);
      }
    }, {
      key: "response",
      value: function response(message) {
        this.send(message);
      }
    }, {
      key: "generateRandomID",
      value: function generateRandomID() {
        var id = null;
        while (true) {
          id = Math.random().toString(16).slice(-8).toUpperCase();
          if (id in this.contexts == false) {
            break;
          }
        }
        return id;
      }
    }]);

    return MickrClient;
  }(EventEmitter);

  ;

  /* 雲を表示するベースの生成 */

  var Sky = function (_EventEmitter2) {
    _inherits(Sky, _EventEmitter2);

    function Sky(option) {
      _classCallCheck(this, Sky);

      var _this6 = _possibleConstructorReturn(this, (Sky.__proto__ || Object.getPrototypeOf(Sky)).call(this));

      option = option || {};
      _this6.client = null;
      _this6.clouds = [];
      _this6.selected = [];

      if (option.element === undefined) {
        var div = document.createElement('div');
        div.id = "sky";
        div.className = 'sky';
        document.body.appendChild(div);
        _this6.element = div;
      } else {
        _this6.element = document.getElementById(option.elementID);
      }
      return _this6;
    }

    _createClass(Sky, [{
      key: "send",
      value: function send(command, message, callback) {
        if (this.client !== null) this.client.send(command, message, callback);
      }
    }, {
      key: "on",
      value: function on(command, message, callback) {
        if (this.client !== null) this.client.on(command, message, callback);
      }
    }, {
      key: "broadcast",
      value: function broadcast(command, message, callback) {
        if (this.client !== null) this.client.broadcast(command, message, callback);
      }
    }, {
      key: "appendCloud",
      value: function appendCloud(cloud) {
        cloud.parent.appendChild(cloud.element);
        this.clouds.push(cloud);
      }

      /* sky上に雲の追加 */

    }, {
      key: "addCloud",
      value: function addCloud(option) {
        if (option) {
          option.parent = option.parent || this.element;
          option.mouseover = option.mouseover || this.mouseover.bind(this);
          option.mouseout = option.mouseout || this.mouseout.bind(this);
          option.onComplete = option.onComplete || this.onComplete.bind(this);
          option.onClick = option.onClick || this.onClick.bind(this);
        }

        var cloud = new Cloud(option);
        cloud.addHandler(option);
        cloud.option = option;
        this.appendCloud(cloud);
        return cloud;
      }
    }, {
      key: "outerPause",
      value: function outerPause() {
        this.clouds.forEach(function (cloud) {
          if (!cloud.selected) {
            cloud.animator.pause('around');
          }
        });
      }
    }, {
      key: "outerResume",
      value: function outerResume() {
        this.clouds.forEach(function (cloud) {
          if (!cloud.selected) {
            cloud.animator.resume('around');
          }
        });
      }
    }, {
      key: "mouseover",
      value: function mouseover(cloud) {}
    }, {
      key: "mouseout",
      value: function mouseout(cloud) {}
    }, {
      key: "onComplete",
      value: function onComplete(cloud) {
        this.clouds.splice(this.clouds.indexOf(cloud), 1);
      }
    }, {
      key: "returnClouds",
      value: function returnClouds() {
        var _this7 = this;

        this.selected.forEach(function (c) {
          c.onClick();
          _this7.clouds.push(c);
        });
        this.selected = [];
      }
    }, {
      key: "onClick",
      value: function onClick(cloud) {
        if (!cloud.selected) {
          this.selected.push(cloud);
          this.clouds.splice(this.clouds.indexOf(cloud), 1);
          this.outerResume();
        } else {
          this.selected.splice(this.selected.indexOf(cloud), 1);
          this.clouds.push(cloud);
        }
        cloud.onClick();
      }
    }, {
      key: "selectedText",
      value: function selectedText() {
        return this.selected ? this.selected.map(function (cloud) {
          return cloud.text;
        }) : [];
      }
    }]);

    return Sky;
  }(EventEmitter);

  /* 雲オブジェクトの生成 */


  var Cloud = function () {
    function Cloud(option) {
      _classCallCheck(this, Cloud);

      option = option !== undefined ? option : {
        parent: document.getElementById('sky'),
        id: generateRandomID(),
        size: 1.0,
        tags: ["none"]
      };
      this.parent = option.parent || document.getElementById('sky');
      this.element = null;
      this.clickAnimation = function () {};

      this.visible = option.visible === undefined ? true : option.visible;
      this.color = option.color || "#FFFFFF";

      this.id = option.id || generateRandomID();
      this.size = option.size || 1.0;
      this.tags = option.tags || ["none"];
      this.createCloud(option);
      this.setAnimator(option);
    }

    _createClass(Cloud, [{
      key: "export",
      value: function _export() {
        var ret = this.option;
        ret.text = this.text;
        ret.position = this.getPosition();
      }
    }, {
      key: "appendSky",
      value: function appendSky(parent) {
        this.parent = parent || this.parent;
        parent.appendChild(this.element);
      }
    }, {
      key: "setAnimator",
      value: function setAnimator(option) {
        this.animator = new Animator({
          parent: this,
          element: this.element
        });
        this.animator.initAnimation(option);
      }
    }, {
      key: "isCollision",
      value: function isCollision(x, y) {
        var rect = this.element.getBoundingClientRect();
        var X = x - rect.left;
        var Y = y - rect.top;
        var W = rect.width;
        var H = rect.height;
        return X >= 0 && X <= W && Y >= 0 && Y <= H;
      }
    }, {
      key: "createCloud",
      value: function createCloud(option) {
        if (this.element) return 0;
        switch (option.type) {
          case "rect":
            console.log("rect");
            var rect = document.createElement('div');
            rect.style.position = "absolute";
            rect.style.fontSize = "x-large";
            rect.style.fontColor = "black";
            rect.style.border = 'black solid 1px';
            rect.style.backgroundColor = option.color;
            rect.style.opacity = this.visible && this.visible === undefined ? 1.0 : 0.0;
            rect.innerText = option.text;
            this.element = rect;
            this.setPosition(option.position);
            break;
          case "custom":
            this.element = option.body || document.getElementById('div');
            break;
          default:
            this.element = this.createCloudElement();
            this.setColor(option.color);
            this.setText(option.text, option.textColor);
            this.setImage(option.url);
            this.setPosition(option.position);
            this.setSize(option.size);
            break;
        }
      }
    }, {
      key: "getSize",
      value: function getSize() {
        return {
          width: this.element.getBoundingClientRect().width,
          height: this.element.getBoundingClientRect().height
        };
      }
    }, {
      key: "setSize",
      value: function setSize(scale) {
        var duration = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0.5;

        TweenLite.to(this.element, duration, { scale: scale });
      }
    }, {
      key: "getPosition",
      value: function getPosition() {
        var rect = this.element.getBoundingClientRect();
        return {
          x: parseInt(rect.left),
          y: parseInt(rect.top)
        };
      }
    }, {
      key: "setPosition",
      value: function setPosition(position) {
        position = position || { x: 0, y: 0 };
        // this.element.style.left = position.x+"px";
        // this.element.style.top = position.y+"px";
        // this.animator.animations['to'](position, 0)
      }
    }, {
      key: "setText",
      value: function setText(text, color) {
        this.text = text === undefined ? "" : text;
        color = color === undefined ? "#000000" : color;
        this.element.querySelector('.cloud_text').innerText = this.text;
        this.element.querySelector('.cloud_text').style.color = color;
      }
    }, {
      key: "setColor",
      value: function setColor(color) {
        this.color = color || "#FFFFFF";
        this.element.querySelector('.cloud path').style.fill = this.color;
      }
    }, {
      key: "setImage",
      value: function setImage(url) {
        this.src = url;
        // var data = new Uint8Array(this.response);
        // var oURL = URL.createObjectURL(new Blob([data], { type: "image/png" }));

        if (url) {
          this.element.querySelector('.cloud_image').style.display = 'block';
          this.element.querySelector('.cloud_image').src = url;
        } else {
          this.element.querySelector('.cloud_image').style.display = 'none';
        }
      }
    }, {
      key: "remove",
      value: function remove() {
        this.parent.removeChild(this.element);
      }
    }, {
      key: "addHandler",
      value: function addHandler(option) {
        var _this8 = this;

        this.element.addEventListener('mouseover', function () {
          option.mouseover(_this8);
        }.bind(this));
        this.element.addEventListener('mouseout', function () {
          option.mouseout(_this8);
        }.bind(this));
        this.element.addEventListener('click', function (e) {
          _this8.onClick();
        }.bind(this));
      }
    }, {
      key: "onClick",
      value: function onClick() {
        if (this.selected) {
          this.animator.returnOuterAround();
        } else {
          if (this.animator.timeline['click']) this.animator.resume('click');
          this.selected = true;
        }
      }
    }, {
      key: "getPosition",
      value: function getPosition() {
        this.position = { x: this.element.getBoundingClientRect().left, y: this.element.getBoundingClientRect().top };
        return this.position;
      }
    }, {
      key: "createCloudElement",
      value: function createCloudElement() {
        var div = document.createElement('div');
        var svg_div = document.createElement('div');
        var text = document.createElement('div');
        var svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
        var path = document.createElementNS("http://www.w3.org/2000/svg", 'path');
        var _img = document.createElement('img');
        div.id = "rcmnd";
        div.classList.add('rcmnd');
        div.setAttribute('draggable', true);
        svg_div.classList.add("cloud-div");
        text.className = "cloud_text flexiblebox";
        _img.className = "cloud_image flexiblebox";
        svg.setAttribute('xmlns', "http://www.w3.org/2000/svg");
        svg.setAttribute('xmlns:xlink', "http://www.w3.org/1999/xlink");
        svg.setAttribute("xml:space", "preserve");
        svg.setAttribute('class', "cloud");
        svg.setAttribute('viewBox', "343.523 211.385 160.252 109.403");
        svg.setAttribute('style', "enable-background:new 343.523 211.385 160.252 109.403;");
        svg.setAttribute('width', "100%");
        svg.setAttribute('height', "100%");
        path.setAttribute('class', "st0");
        path.setAttribute('style', "fill: rgba(200, 200, 200, 0.6); stroke-width: 3px;");
        path.setAttribute('d', "M491.348,254.364c0.067-0.643,0.1-1.294,0.1-1.954c0-10.53-8.537-19.068-19.068-19.068\n            c-1.038,0-2.054,0.086-3.045,0.246c-1.761-6.571-7.741-11.417-14.868-11.417c-2.479,0-4.814,0.601-6.891,1.642\n            c-7.422-7.661-17.812-12.428-29.319-12.428c-13.639,0-25.708,6.694-33.124,16.969c-1.776-0.51-3.65-0.789-5.59-0.789\n            c-11.17,0-20.225,9.054-20.225,20.224c0,0.567,0.029,1.127,0.075,1.684c-9.136,2.431-15.869,10.757-15.869,20.659\n            c0,9.252,5.879,17.131,14.105,20.108c-0.145,0.854-0.237,1.725-0.237,2.621c0,8.616,6.985,15.601,15.602,15.601\n            c2.671,0,5.184-0.674,7.382-1.857c4.336,6.022,11.403,9.946,19.39,9.946c4.801,0,9.267-1.42,13.011-3.858\n            c3.879,4.928,9.894,8.096,16.651,8.096c3.79,0,7.345-1,10.422-2.745c2.309,0.874,4.985,1.376,7.843,1.376\n            c4.795,0,9.084-1.41,11.966-3.629c1.977,0.493,4.042,0.76,6.172,0.76c13.647,0,24.798-10.673,25.571-24.127\n            c7.288-3.235,12.374-10.529,12.374-19.017C503.776,264.897,498.665,257.587,491.348,254.364z");
        svg.appendChild(path);
        svg_div.appendChild(svg);
        div.appendChild(_img);
        div.appendChild(svg_div);
        div.appendChild(text);
        return div;
      }
    }]);

    return Cloud;
  }();

  var Animator = function (_EventEmitter3) {
    _inherits(Animator, _EventEmitter3);

    function Animator(option) {
      _classCallCheck(this, Animator);

      var _this9 = _possibleConstructorReturn(this, (Animator.__proto__ || Object.getPrototypeOf(Animator)).call(this));

      _this9.parent = option.parent || {};
      _this9.state = 'init';
      _this9.element = option.element || document.createElement('div');
      _this9.animations = {};
      _this9.timeline = {};
      return _this9;
    }

    _createClass(Animator, [{
      key: "initAnimation",
      value: function initAnimation(op) {
        var _this10 = this;

        var self = this;
        this.animations = {
          zero: function zero() {
            var tl = new TimelineLite();
            tl.add([TweenLite.to(self.element, 0.5, { scale: 1.0, x: 0, y: 0 })]);
            return tl;
          },
          expand: function expand(ratio) {
            var duration = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0.5;

            var tl = new TimelineLite();
            ratio = ratio === undefined ? 2.5 : ratio;
            tl.add([TweenLite.to(self.element, 0.5, { scale: 2.5 })]);
            return tl;
          },
          /* 振動 */
          swing: function swing(option) {
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
              tl.add(TweenMax.to(self.element, option.duration / 4 / option.interval, forward_params));
              var backward_params = JSON.parse(JSON.stringify(params));
              backward_params[option.direction] = "-=" + (Math.random() * option.range + 3);
              tl.add(TweenMax.to(self.element, option.duration / 4 / option.interval, backward_params));
            }

            return tl;
          },

          /* 右へ外回り移動 */
          Right: function Right(option) {
            var tl = new TimelineLite();
            var animations = [TweenLite.to(self.element, option.duration, {
              x: w,
              y: 0,
              xPercent: -150,
              yPercent: 50,
              ease: Sine.easeInOut,
              onComplete: function () {
                self.state = 'Down';
                if (option.onComplete) option.onComplete();
              }.bind(self)
            })];
            if (option.rotation) animations.push(TweenLite.to(self.element, option.duration, { rotation: '-135' }));
            if (option.swing) animations.push(self.animations["swing"]({ duration: option.duration, interval: 10, range: 5, direction: 'top' }));

            tl.add(animations);

            return tl;
          },

          Down: function Down(option) {
            var tl = new TimelineLite();

            var animations = [TweenLite.to(self.element, option.duration, {
              x: w,
              y: h,
              xPercent: -150,
              yPercent: -150,
              ease: Sine.easeInOut,
              onComplete: function onComplete() {
                self.state = 'Left';
                if (option.onComplete) option.onComplete();
              }
            })];
            if (option.rotation) animations.push(TweenLite.to(self.element, option.duration, { rotation: '-45' }));
            if (option.swing) animations.push(self.animations["swing"]({ duration: option.duration, interval: 10, range: 5, direction: 'left' }));

            tl.add(animations);

            return tl;
          },

          /* 左へ外回り移動 */
          Left: function Left(option) {
            var tl = new TimelineLite();

            var animations = [TweenLite.to(self.element, option.duration, {
              x: 0,
              y: h,
              xPercent: 50,
              yPercent: -150,
              ease: Sine.easeInOut,
              onComplete: function onComplete() {
                self.state = 'Up';
                if (option.onComplete) option.onComplete();
              }
            })];
            if (option.rotation) animations.push(TweenLite.to(self.element, option.duration, { rotation: '45' }));
            if (option.swing) animations.push(self.animations["swing"]({ duration: option.duration, interval: 10, range: 5, direction: 'top' }));

            tl.add(animations);

            return tl;
          },

          /* 上へ外回り移動 */
          Up: function Up(option) {
            var tl = new TimelineLite();

            var animations = [TweenLite.to(self.element, option.duration, {
              x: 0,
              y: 0,
              xPercent: 50,
              yPercent: 50,
              ease: Sine.easeInOut,
              onComplete: function onComplete() {
                self.state = 'Done';
                if (option.onComplete) option.onComplete();
              }
            })];
            if (option.rotation) animations.push(TweenLite.to(self.element, option.duration, { rotation: '135' }));
            if (option.swing) animations.push(self.animations["swing"]({ duration: option.duration, interval: 10, range: 5, direction: 'left' }));

            tl.add(animations);

            return tl;
          },

          to: function to() {
            var position = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { x: 0, y: 0 };
            var duration = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;

            var tl = new TimelineLite();
            tl.add([TweenLite.to(self.element, duration, { left: position.x, top: position.y })]);
            return tl;
          },
          fromTo: function fromTo() {
            var start = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { x: 0, y: 0 };
            var end = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { x: 0, y: 0 };
            var duration = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 2;
            return TweenLite.fromTo(self.element, duration, { left: start.x, top: start.y }, { left: end.x, top: end.y });
          },
          rotate: function rotate() {
            var angle = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
            var duration = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
            return TweenLite.to(self.element, duration, { rotation: angle });
          },
          fadeIn: function fadeIn() {
            var duration = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 2;
            var alpha = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1.0;
            return TweenLite.to(self.element, duration, { alpha: alpha });
          },
          fadeOut: function fadeOut() {
            var duration = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 2;
            return TweenLite.to(self.element, duration, { alpha: alpha });
          },

          Around: function Around() {
            var start = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { x: 0, y: 0 };
            var end = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { x: 0, y: 0 };
            var swing = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
            var rotation = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;

            var tl = new TimelineLite({ onComplete: onComplete, onUpdateParams: ["{self}"] });
            tl.add(TweenLite.fromTo(self.element, 2, {
              rotation: 0,
              xPercent: 0,
              yPercent: 0,
              x: start.x,
              y: start.y
            }, {
              rotation: rotation ? -235 : 0,
              xPercent: 50,
              yPercent: 50,
              y: 0,
              onComplete: function () {
                self.state = 'Right';
              }.bind(self)
            }));

            tl.add('Around');
            tl.add('Right');
            tl.add(_this10.animations['Right']({ duration: option.position ? 9 * ((w - option.position.x) / w) : 9, swing: option.swing_right, rotation: option.rotation }));
            tl.add('Down');
            tl.add(_this10.animations['Down']({ duration: 8, swing: option.swing, rotation: option.rotation }));
            tl.add('Left');
            tl.add(_this10.animations['Left']({ duration: 9, swing: option.swing, rotation: option.rotation }));
            tl.add('Up');
            tl.add(_this10.animations['Up']({ duration: 8, swing: option.swing, rotation: option.otation }));
            tl.add(TweenLite.fromTo(self.element, 2, { rotation: 0, xPercent: 0, yPercent: 0, left: end.x, top: end.y }));
            tl.add('Done');

            return tl;
          },
          centering: function centering(position) {
            var ratio = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 3.0;
            var duration = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 2.0;

            var tl = new TimelineLite();
            position = position || { x: w / 2 - 100, y: h / 2 - 100 };
            position.x = position.x || w / 2 - 100;
            position.y = position.y || h / 2 - 100;
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
    }, {
      key: "addAnimation",
      value: function addAnimation(name, func) {
        if (name) {
          this.animations[name] = func;
          this.on(name, func);
        } else console.error("name is undefined");
      }
    }, {
      key: "pause",
      value: function pause(name) {
        if (this.timeline[name]) this.timeline[name].pause();
      }
    }, {
      key: "resume",
      value: function resume(name) {
        if (this.timeline[name]) this.timeline[name].resume();
      }
    }, {
      key: "start",
      value: function start(name) {
        if (this.timeline[name]) this.timeline[name].start();
      }
    }, {
      key: "pauseAll",
      value: function pauseAll() {
        var _this11 = this;

        Object.keys(this.timeline).forEach(function (k) {
          return _this11.pause(k);
        });
      }
    }, {
      key: "resumeAll",
      value: function resumeAll() {
        var _this12 = this;

        Object.keys(this.timeline).forEach(function (k) {
          return _this12.resume(k);
        });
      }
    }, {
      key: "startAll",
      value: function startAll() {
        var _this13 = this;

        Object.keys(this.timeline).forEach(function (k) {
          return _this13.start(k);
        });
      }
    }, {
      key: "addGoAround",
      value: function addGoAround(option) {
        var _this14 = this;

        this.timeline['around'] = this.goAround({
          el: this.element,
          swing: option.swing === undefined ? false : option.swing,
          rotation: option.rotation === undefined ? false : option.rotation,
          position: option.position,
          onUpdate: function (tl) {
            _this14.now = tl.totalTime();
          }.bind(this),
          onComplete: option.onComplete
        });
      }
    }, {
      key: "goAround",
      value: function goAround(option) {
        var _this15 = this;

        var tl = new TimelineLite({ onComplete: option.onComplete.bind(this.parent), onUpdate: option.onUpdate, onUpdateParams: ["{self}"] });

        if (option.position) {
          tl.add(TweenLite.fromTo(this.element, 2, {
            rotation: 0,
            xPercent: 0,
            yPercent: 0,
            x: option.position.x,
            y: option.position.y
          }, {
            rotation: option.rotation ? -235 : 0,
            xPercent: 50,
            yPercent: 50,
            y: 0,
            onComplete: function onComplete() {
              _this15.state = 'Right';
            }
          }));
        } else {
          tl.add(TweenLite.set(this.element, { rotation: option.rotation ? -235 : 0, xPercent: 50, yPercent: 50, onComplete: function onComplete() {
              _this15.state = 'Right';
            } }));
        }

        tl.add('Around');
        tl.add('Right');
        tl.add(this.animations['Right']({ duration: option.position ? 9 * ((w - option.position.x) / w) : 9, swing: option.swing, rotation: option.rotation }));
        tl.add('Down');
        tl.add(this.animations['Down']({ duration: 8, swing: option.swing, rotation: option.rotation }));
        tl.add('Left');
        tl.add(this.animations['Left']({ duration: 9, swing: option.swing, rotation: option.rotation }));
        tl.add('Up');
        tl.add(this.animations['Up']({ duration: 8, swing: option.swing, rotation: option.otation }));
        tl.add('Done');

        return tl;
      }
    }, {
      key: "goAroundSmall",
      value: function goAroundSmall(center, r) {
        var tl = new TimelineLite({
          onComplete: function onComplete(self) {
            self.restart();
          },
          onCompleteParams: ["{self}"],
          repeat: -1
        });
        tl.add('goAroundSmall');
        tl.add(TweenLite.to(this.element, 2, {
          x: w / 2,
          y: h / 2 + 200,
          rotation: 720,
          xPercent: "-50%",
          yPercent: "-50%"
        }));
        var tl_around = new TimelineMax({ repeat: -1 });
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
        tl.add([TweenMax.to(this.element, 8, {
          rotation: 1080,
          ease: Linear.easeNone,
          repeat: -1
        }), TweenMax.to(this.element, 4, {
          yPercent: "-=390",
          yoyo: true,
          repeat: -1,
          ease: Sine.easeInOut
        }), tl_around]);
        return tl;
      }
    }, {
      key: "returnOuterAround",
      value: function returnOuterAround() {
        var _this16 = this;

        var tl = new TimelineLite();
        tl.add(TweenLite.to(this.element, 0.5, { scale: 1.0 }));
        switch (this.state) {
          case 'Right':
            this.animations['Right']({
              duration: 1.0,
              rotation: this.rotation,
              swing: false,
              onComplete: function onComplete() {
                _this16.selected = false;
                _this16.timeline['around'].seek('Down').resume();
              }
            });
            break;
          case 'Down':
            this.animations['Down']({
              duration: 1.0,
              rotation: this.rotation,
              swing: false,
              onComplete: function onComplete() {
                _this16.selected = false;
                TweenLite.to(_this16.element, 2, { scale: 1 });
                _this16.timeline['around'].seek('Left').resume();
              }
            });
            break;
          case 'Left':
            this.animations['Left']({
              duration: 1.0,
              rotation: this.rotation,
              swing: false,
              onComplete: function onComplete() {
                _this16.selected = false;
                TweenLite.to(_this16.element, 2, { scale: 1 });
                _this16.timeline['around'].seek('Up').resume();
              }
            });
            break;
          case 'Up':
            this.animations['Up']({
              duration: 1.0,
              rotation: this.rotation,
              swing: false,
              onComplete: function onComplete() {
                _this16.selected = false;
                TweenLite.to(_this16.element, 2, { scale: 1 });
                _this16.timeline['around'].seek('Done').resume();
              }
            });
            break;
        }
      }
    }]);

    return Animator;
  }(EventEmitter);

  var MickrSky = function (_Sky) {
    _inherits(MickrSky, _Sky);

    function MickrSky(option) {
      _classCallCheck(this, MickrSky);

      option = option || {};

      var _this17 = _possibleConstructorReturn(this, (MickrSky.__proto__ || Object.getPrototypeOf(MickrSky)).call(this, option));

      if (!isNode && option.client) {
        option.id = option.id || generateRandomID();
        option.url = "ws://apps.wisdomweb.net:64260/ws/mik";
        option.site = option.site || "test";
        option.token = option.token || "Pad:9948";
        _this17.client = new MickrClient(option);
      }

      if (isNode) _this17.setRendererEvent();
      return _this17;
    }

    /* sky上に雲の追加 */


    _createClass(MickrSky, [{
      key: "addCloud",
      value: function addCloud(option) {
        if (option) {
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

        var cloud = new MickrCloud(option);
        cloud.addHandler(option);
        this.appendCloud(cloud);
        return cloud;
      }
    }, {
      key: "setRendererEvent",
      value: function setRendererEvent() {
        var _this18 = this;

        this.element.addEventListener('click', function (e) {
          if (_this18.clouds.length > 0) {
            if (!_this18.clouds.some(function (c) {
              return c.isCollision(e.pageX, e.pageY);
            })) {
              ipcRenderer.send('collision', {
                transparent_mode: true
              });
            }
          }
        });

        ipcRenderer.on('mickr', function (e, data) {
          _this18.addCloud(data);
        });

        /* 透明画面の切り替え */
        ipcRenderer.on('switch_mode', function (e, transparent_mode) {
          if (transparent_mode) {
            document.body.style.backgroundColor = 'transparent';
          } else {
            document.body.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
          }
        });
        ipcRenderer.on('switch_pause', function (e, pause) {
          if (pause) {
            _this18.animator.pauseAll();
          } else {
            _this18.animator.resumeAll();
          }
        });
        ipcRenderer.on('click', function (e, data) {
          var text = "";
          if (_this18.clouds.some(function (c) {
            var q = c.isCollision(data.x, data.y);
            if (q) {
              text = c.text;
            }
            return q;
          })) {
            ipcRenderer.send('collision', {
              text: text,
              transparent_mode: false
            });
          }
        });
      }
    }]);

    return MickrSky;
  }(Sky);

  var MickrCloud = function (_Cloud) {
    _inherits(MickrCloud, _Cloud);

    function MickrCloud(option) {
      _classCallCheck(this, MickrCloud);

      var _this19 = _possibleConstructorReturn(this, (MickrCloud.__proto__ || Object.getPrototypeOf(MickrCloud)).call(this, option));

      option.parent = option.parent || _this19.parent;
      option.color = option.color || "#FFFFFF";
      _this19.element = _this19.createCloudElement();
      _this19.setColor(option.color);
      _this19.setText(option.text, option.textColor);
      _this19.setImage(option.url);
      _this19.setPosition(option.position);
      _this19.setSize(option.size);
      _this19.setAnimator(option);

      option['onComplete'] = _this19.remove;
      if (option.around) {
        _this19.animator.addGoAround(option);
      } else {
        if (option.random) _this19.setPosition(generateRandomInt(0, w - 150), generateRandomInt(0, h - 150));
        if (!option.immortal) {
          setTimeout(function () {
            _this19.remove();
          }, 10000);
        }
      }
      _this19.option = option;

      _this19.animator.animations['click'] = _this19.animator.animations['centering'].bind(_this19.animator);
      _this19.animator.animations['clicked'] = _this19.animator.returnOuterAround.bind(_this19.animator);
      return _this19;
    }

    _createClass(MickrCloud, [{
      key: "onClick",
      value: function onClick() {
        if (this.selected) {
          this.animator.pause('click');
          this.animator.animations['clicked']();
          // this.animator.returnOuterAround()
          this.selected = false;
        } else {
          this.animator.pause('around');
          this.animator.timeline['click'] = this.animator.animations['click']();
          this.selected = true;
        }
      }
    }]);

    return MickrCloud;
  }(Cloud);
})();

