var electron = null;
if(isNode) electron = require('electron');

$('ready', function(e){
  $.material.init();

  window.SpeechRecognition = window.SpeechRecognition || webkitSpeechRecognition;
  var recognition = new SpeechRecognition();
  recognition.lang = 'ja';

  var sky = null;
  var url = null;
  var around = true;
  var swing = true;
  var rotation = true;
  var visible = true;
  var updated = false;

  var ipcRenderer = null
  if(isNode) ipcRenderer = electron.ipcRenderer;
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  var globalCompositeOperation  = 'source-over';
  var start_x = 0;
  var start_y = 0;
  var x = 0;
  var y = 0;
  var color = "red";
  var size = 10;
  var flag = false;
  var count = 0;
  var record = []
  var candidate = null;

  const CALIBRATION = {
    x: -150,
    y: -150,
    w: 300,
    h: 300
  };
  const default_main = {
    color: "#777777",
    text: "",
    textColor: "#000000",
    scale: 1,
    image: {},
    calibration: CALIBRATION
  };
  var main = Object.assign({}, default_main);

  var preview = document.getElementById('preview')

  preview.innerHTML = document.getElementById('rcmnd_template').innerHTML;
  preview.querySelector('.cloud_text').style.fontSize = "50px";
  console.log(preview.querySelector('.cloud path'));
  preview.querySelector('.cloud path').setAttribute('style', `fill: url('#cloud-gradient'); filter: url('#cloud-filter');`)

  document.querySelector('.mdl-layout__drawer').addEventListener('click', function () {
    document.querySelector('.mdl-layout__obfuscator').classList.remove('is-visible');
    this.classList.remove('is-visible');
  }, false);

  $('#attibute-mode-btn').on('click', function(){
    console.log("click");
    $('#attribute-modal').modal()
    // $('#attribute-modal').focus()
  })

  $('#attribute-tabs').on('click', function(e){
    console.log(this);
  })

  $("#cloud-attribute-title-color").spectrum({
    color: "black",
    showInput: true,
    showInitial: true,
    showAlpha: true,
    clickoutFiresChange: true,
    cancelText: "cancel",
    chooseText: "OK",
    className: "text-color-btn",
    preferredFormat: "rgb",
    change: function(color){
      var c = color.toString()

      if(main.color_mode === 'text'){
        $('.input_text').css({color: c})
        main.textColor = c
      }
      else if(main.color_mode === 'cloud'){
        main.color = c;
        $('.stop2').css("stop-color", c);
      }
    }
  });

  $("#cloud-attribute-body-color").spectrum({
    color: "black",
    showInput: true,
    showInitial: true,
    showAlpha: true,
    clickoutFiresChange: true,
    cancelText: "cancel",
    chooseText: "OK",
    className: "text-color-btn",
    preferredFormat: "rgb",
    change: function(color){
      var c = color.toString()

      if(main.color_mode === 'text'){
        $('.input_text').css({color: c})
        main.textColor = c
      }
      else if(main.color_mode === 'cloud'){
        main.color = c;
        $('.stop2').css("stop-color", c);
      }
    }
  });

  $("#text-attribute-color").spectrum({
    color: "black",
    showInput: true,
    showInitial: true,
    showAlpha: true,
    clickoutFiresChange: true,
    cancelText: "cancel",
    chooseText: "OK",
    className: "text-color-btn",
    preferredFormat: "rgb",
    change: function(color){
      var c = color.toString()

      if(main.color_mode === 'text'){
        $('.input_text').css({color: c})
        main.textColor = c
      }
      else if(main.color_mode === 'cloud'){
        main.color = c;
        $('.stop2').css("stop-color", c);
      }
    }
  });

  $("#text-color").spectrum({
    color: "black",
    flat: true,
    showInput: true,
    showInitial: true,
    showAlpha: true,
    clickoutFiresChange: true,
    cancelText: "cancel",
    chooseText: "OK",
    className: "text-color-btn",
    preferredFormat: "rgb",
    change: function(color){
      var c = color.toString()

      if(main.color_mode === 'text'){
        $('.input_text').css({color: c})
        main.textColor = c
      }
      else if(main.color_mode === 'cloud'){
        main.color = c;
        $('.stop2').css("stop-color", c);
      }
    }
  });

  // document.getElementById('text-property').querySelector('.text-color-btn').style.display = "none"
  document.getElementById('text-property').querySelector('.text-color-btn').style.border = "none"
  document.getElementById('text-property').querySelector('.text-color-btn').style.backgroundColor = "rgba(0,0,0,0)"

  $('#record-btn').on('click', function(){
    console.log("record start",recognition);
    recognition.start();
  })
  recognition.onstart = function(event){
    console.log("start");
  };
  recognition.onend = function(event){
    console.log("end",event);
  };
  recognition.onresult = function(event){
    var text = event.results.item(0).item(0).transcript;
    console.log("result",text);
    document.getElementById('preview').querySelector('.input_text').innerText = '';
    document.getElementById('preview').querySelector('.input_text').innerText = text;
    document.getElementById('preview').querySelector('.input_text').style.border = "none";
  };

  $("#text-property").draggable();
  $("#cloud-property").draggable();
  $("#radio-option-text").on('change', function(){main.color_mode = "text"});
  $("#radio-option-cloud").on('change', function(){main.color_mode = "cloud"});

  $('.input_text').on('input', function(){main.text = this.innerText;})
  $('.input_text').on('click', function(){this.style.border = "none";})
  $('.input_text').on('blur', function(){if(this.innerText === ''){this.style.border = "solid 1px black";}})
  $('.cloud_text .input_text').on('focus', function(){
    $('.text-property').show();
  })
  $('.input_text').on("keydown", function(e) {
    if(e.keyCode === 13) {
      if(this.style.top.length > 0){this.style.top = parseInt(this.style.top) - 50 +'px';}
      else{this.style.top = parseInt(this.getBoundingClientRect().top) - 140 +'px';}
    }
  });
  $('.cloud').on('focus', function(){$('.text-property').toggle();})
  $('.cloud_text').on('dblclick', function(){
    console.log("dblclick");
    $('#attribute-modal').modal()
  })
  $('.translate-btn').click(function(){$('.property').hide()})

  $('.cloud_text').on('focus', function(){$('.cloud-property').show();})

  sky = new MickrSky({
    "elementID": "sky",
    "client": true,
    "id": String(Math.random().toString(36).slice(-8)),
    "url": "ws://apps.wisdomweb.net:64260/ws/mik",
    "site": "ashun",
    "token": "Pad:7732"
  });

  console.log(sky.client);

  $("#file-upload-btn").on('change', function(){
    main.image.name = this.files[0].name;
    fileLoad(this.files);
  });

  $('#play-btn').on('click', function(){sky.addCloud(main)});
  $('#new-btn').on('click', function(){
    main = Object.assign({}, default_main);
    main.image = {}
    console.log(main);
    document.getElementById('preview').querySelector('.cloud_image').src = "";
    document.getElementById('preview').querySelector('.input_text').innerText = "";
    document.getElementById('preview').querySelector('.input_text').style.color = main.textColor;
    document.getElementById('preview').querySelector('.stop2').setAttribute("style", "stop-color: "+main.color+";");
    updated = true;
  });

  $('#upload-btn').click(function(){
    var tl = new TimelineLite()
    tl.add(TweenLite.to(document.getElementById('preview'), 1, {x: 0, y: 50, scale: 0.3}))
    tl.add(TweenLite.to(document.getElementById('preview'), 1.5, {x: 0, y: -800, onComplete: function(){
      sky.broadcast("mickr", {
        "body": {
          "content": main
        }
      }, function(req, res){
        console.log(req,res);
      });
      TweenLite.to(document.getElementById('preview'), 0, {x: 0, y: 800})
      TweenLite.to(document.getElementById('preview'), 0, {x: 0, y: -50, scale: 1.0})
      document.getElementById('preview').querySelector('.input_text').innerText = "";
      updated = true;
    }}))
  })


  $(document).on('dragenter', function (e){
    e.stopPropagation();
    e.preventDefault();
  });
  $(document).on('dragover', function(e){
    e.stopPropagation();
    e.preventDefault();
  });
  $(document).on('drop', function (e){
    e.stopPropagation();
    e.preventDefault();
  });


  dropFileUploader("#preview");
  dropFileUploader("#attribute-drop-area", function(name, url){
    console.log("loaded");
    document.getElementById('attribute-drop-area').querySelector('.text').innerText = '';
    document.getElementById('attribute-image').src = url;
  });


  function dropFileUploader(id, callback){
    var obj = $(id);
    if(obj){
      obj.on('dragenter', function(e){
          e.stopPropagation();
          e.preventDefault();
          $(this).css('border', '2px solid #0B85A1');
      });
      obj.on('dragover', function(e){
         e.stopPropagation();
         e.preventDefault();
      });
      obj.on('drop', function(e){
         $(this).css('border', 'none');
         e.preventDefault();
         var files = e.originalEvent.dataTransfer.files;
         console.log(files);
         fileLoad(files, callback)
      });
    }
    $(document).on('dragover', function(e){
      e.stopPropagation();
      e.preventDefault();
    });
  }

  function fileLoad(fileList, callback){
    var fileReader = new FileReader() ;
    fileReader.onload = function(e) {
      console.log(e);
      var dataUri = this.result ;
      var cloud_image = document.getElementById("preview").querySelector('.cloud_image');
      cloud_image.src = dataUri;
      // main.image.name = file.name;
      main.image.url = dataUri;
      callback(fileList[0].name, dataUri)
    }
    fileReader.readAsDataURL(fileList[0]);
  }

  canvas.addEventListener('mousedown', drawstart, false);
  canvas.addEventListener('mousemove', drawing, false);
  canvas.addEventListener('mouseup', drawend, false);

  if(isNode) ipcRenderer.on('autodraw', (e,data) => {
    var candidates = document.getElementById('canvas-candidates').children;
    for(var i=0; i<candidates.length; i++){
      console.log(data.results);
      candidates[i].querySelector('.candidate-image').alt = data.results[i].name
      candidates[i].querySelector('.candidate-image').src = data.results[i].url
    }
  })

  $('.canvas-candidate').on('click', function(){
    var name = this.querySelector('.candidate-image').alt
    $.ajax({type: 'get', url: this.querySelector('.candidate-image').src})
      .done(function(data){
        var svg = data.firstChild;
        var parser = new DOMParser();
        var def = parser.parseFromString(`
          <svg>
            <defs>
              <radialGradient id="cloud-gradient-`+name+`">
                <stop class="stop1" offset="0%"/>
                <stop class="stop2" offset="100%"/>
              </radialGradient>
              <filter id="cloud-filter-`+name+`" x="-50%" y="-50%" width="200%" height="200%">
                <feOffset result="offOut" in="SourceGraphic" dx="0" dy="0" />
                <feColorMatrix result="matrixOut" in="offOut" type="matrix"
                values="0.2 0 0 0 0 0 0.2 0 0 0 0 0 0.2 0 0 0 0 0 1 0" />
                <feGaussianBlur result="blurOut" in="matrixOut" stdDeviation="10" />
                <feBlend in="SourceGraphic" in2="blurOut" mode="normal" />
              </filter>
            </defs>
          </svg>`, "image/svg+xml").firstChild;
          svg.className = name;

          var children = svg.children;
          for(var i=1; i<children.length-1; i++){
            children[i].setAttribute('style', `stroke-width: 3px; position: absolute; fill: url('#cloud-gradient-`+name+`'); filter: url('#cloud-filter-`+name+`');`);
          }

          svg.appendChild(def.children[0])
          candidate = new XMLSerializer().serializeToString(svg);
          ctx.clearRect(0,0,canvas.width, canvas.height)
          document.getElementById('candidate-preview').insertAdjacentHTML('afterbegin', candidate);
          $('#cloud-gradient-'+name+' .stop2').css("stop-color", main.color);
      });
  })

  $('#canvas-upload-btn').on('click', function(){
    console.log(candidate);
    var div = document.createElement('div')
    var text = document.createElement('div')
    var _img = document.createElement('img')

    div.classList.add('rcmnd');
    div.setAttribute('draggable', true);
    div.setAttribute('style', "position: absolute;");
    text.className = "cloud_text flexiblebox";
    text.setAttribute("style", "position: absolute;");
    _img.className = "cloud_image flexiblebox";

    document.getElementById('candidate-preview').innerHTML = '';
    preview.innerHTML = "";
    preview.insertAdjacentHTML('afterbegin', candidate);
    $('#cloud-gradient-'+name+' .stop2').css("stop-color", main.color);
    preview.appendChild(_img)
    preview.appendChild(text)
    main.svg = candidate;
    main.calibration = {
      x: 0,
      y: 0,
      w: -220,
      h: -220
    };
  })

  function drawstart(e){
    console.log("start", e);
    flag = true;
    start_x = e.layerX;
    start_y = e.layerY;
    console.log(record);
    record.push({x: start_x, y:start_y})
  }

  function drawing(e){
    if(flag){
      count++;
      if(count > 5){
        console.log("move");
        count = 0;
        e.preventDefault();

        x = e.layerX;
        y = e.layerY;

        ctx.globalCompositeOperation = globalCompositeOperation;
        ctx.strokeStyle = main.color;
        ctx.beginPath();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.lineWidth = size;
        ctx.moveTo(start_x, start_y);
        ctx.lineTo(x, y);
        ctx.fillStyle = color;
        ctx.font = "20px sans";
        ctx.closePath();
        ctx.stroke();

        start_x = x;
        start_y = y;
        record.push({x: start_x, y:start_y})
      }
    }
  }

  function drawend(e){
    console.log("end");
    flag = false;
    console.log(record);
    if(isNode) ipcRenderer.send('record', {shape: record})
    record = []
  }

  $('#myModal').modal()
  $('#submit').click(function(e){
    $('body').removeClass('modal-open');
    $('.modal-backdrop').remove();
    $('#myModal').modal('hide');

    $('#text').change(function(){
      cloud.setText($('#text').val(), '#'+$('#text-color').val());
    })

    $('#text-color').change(function(){
      cloud.setText($('#text').val(), '#'+$('#text-color').val());
    })

    $('#color').change(function(){
      cloud.setColor($('#color').val());
    })

    $("#img-file").change(function(e){
      var file = e.target.files[0];
      var reader = new FileReader()
      if(file.type.indexOf("image") < 0){return false;}
      reader.addEventListener('loadend', function(e){
        url = e.target.result;
        cloud.setImage(e.target.result)
      })
      reader.readAsDataURL(file)
    })

    $('#ch-around').change(function(){around = !around})
    $('#ch-swing').change(function(){swing = !swing})
    $('#ch-rotation').change(function(){rotation = !rotation})
    $('#ch-visible').change(function(){visible = !visible})

  })
})
