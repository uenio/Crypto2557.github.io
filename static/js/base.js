String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
};
    
function handle_nan(val){
  return (isNaN(val)) ? 0 : val;
}

// IIFE - Immediately Invoked Function Expression
(function(yourcode) {
  yourcode(window.jQuery, window.indexedDB, window, document);
}(function($, indexedDB, window, document) {
  $(function() {
    $("#import-button").click(function(){ 
      $('#dbupload').trigger('click');
    });

    $("#dbupload").change(function(e){ 
      var files = document.getElementById('dbupload').files;
      var fr = new FileReader();
      fr.onload = function(e) { 
        var result = JSON.parse(e.target.result);                       
        var db = new Dexie('endless-farming-db');
        db.open().then(function(){
          var idb_db = db.backendDB();
          clearDatabase(idb_db, function(err) {
            if(!err){
              importFromJsonString(idb_db, result, function(err) {
                if (!err){
                  console.log("Imported data successfully");
                  window.location.reload();
                }
              });
            }
          });
        });
      }
      fr.readAsText(files.item(0));
    });

    $("#export-button").on("click", function(e){
      var db = new Dexie('endless-farming-db');
      db.open().then(function(){
        var idb_db = db.backendDB();
        exportToJsonString(idb_db, function(err, jsonString) {
          if(err){
            console.error(err);
          }
          else {
            var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonString));
            var downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "endless_farming.json");
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
          }
        });
      });                   
    });

    request = idb.open('endless-farming-db');
    request.then(function(db){
      var tx = db.transaction('player', 'readwrite');
      var store = tx.objectStore('player');
      var KL = store.get("KL");
      KL.then(function(val){
        if (val !== undefined){
          $("#KL-number").attr("value", val["value"]);
        }
      });
      var tickets = store.get("tickets");
      tickets.then(function(val){
        if (val !== undefined){
          $("#tickets-number").attr("value", val["value"]);                       
        }
      });
      var refills = store.get("refills");
      refills.then(function(val){
        if (val !== undefined){
          $("#refills-number").attr("value", val["value"]);
          $("#gem-label").text([0, 100, 200, 400, 800, 1200, 1600][val["value"]]);
        }
      });
    });

    $(".user-input").bind('keyup mouseup', function () {
      $this = $(this);
      request = idb.open('endless-farming-db');
      request.then(function(db){
        var tx = db.transaction('player', 'readwrite');
        var store = tx.objectStore('player');
        var KL = store.put({name: this.attr("id").replace("-number", ""), value: this.val()});
        if($this.attr("id") == "KL-number" && $("#dragable-row").length != 0){
          updateStages(this.val());
        }
        if($("#dragable-row").length != 0){
          calculatePetFragmentsToFarm();
        }
      }.bind($this));
    });

    $("#refills-number").bind('keyup mouseup', function(){
      $this = $(this);
      function getSum(total, num) {
        return total + num;
      }
      $("#gem-label").text([0, 100, 200, 400, 800, 1200, 1600].slice(0, handle_nan(parseInt($this.val()))+1).reduce(getSum));
    });

    $('#stats-modal').on('show.bs.modal', function (event){
      var button = $(event.relatedTarget);
      var text = button.data('welcome-text');
      var modal = $(this);
      modal.find('#welcome-text').children().first().text(text);
     });

    request = idb.open('endless-farming-db');
    request.then(function(db){
      var tx = db.transaction('player', 'readwrite');
      var store = tx.objectStore('player');
      var KL = store.get("KL");
      KL.then(function(val){
        if (val !== undefined && val["value"]==0){
          $("#first-visit-button").click();
        }
      });
    });
  });

  (function() {
    'use strict';
    //check for support
    if (!('indexedDB' in window)) {
      console.log('This browser doesn\'t support IndexedDB');
      return;
    }
    var dbPromise = idb.open('endless-farming-db', 2,  function(upgradeDb) {
      switch (upgradeDb.oldVersion) {
        case 0:
          if (!upgradeDb.objectStoreNames.contains('units')) {
            var unitsOS = upgradeDb.createObjectStore('units', {keyPath: 'name'});
            unitsOS.createIndex('nsr', 'nsr', {unique: false});
            unitsOS.createIndex('sr', 'sr', {unique: false});
          }
          if (!upgradeDb.objectStoreNames.contains('pets')) {
            var petsOS = upgradeDb.createObjectStore('pets', {keyPath: 'name'});
            petsOS.createIndex('fragments', 'fragments', {unique: false});
          }
        case 1:
          if(!upgradeDb.objectStoreNames.contains('player')){
            var playerOS = upgradeDb.createObjectStore('player', {keyPath: 'name', autoIncrement:true});
            playerOS.createIndex('value', 'value', {unique: false});
            playerOS.get("KL").then(function(val){
              if (val == undefined){
                playerOS.put({"name": "KL", "value": 0});
              }
            });
            playerOS.get("KL").then(function(val){
              if (val == undefined){
                playerOS.put({"name": "tickets", "value": 0});
              }
            });
            playerOS.get("KL").then(function(val){
              if (val == undefined){
                playerOS.put({"name": "refills", "value": 0});
              }
            });
          }
          var petsOS = upgradeDb.transaction.objectStore('pets');
          petsOS.createIndex('priority', 'priority', {unique: false});
        }   
      });
    })();
  }));