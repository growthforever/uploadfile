	var express = require('express'); 
    var app = express(); 
    var bodyParser = require('body-parser');
    var multer = require('multer');
    var xlstojson = require("xls-to-json-lc");
    var xlsxtojson = require("xlsx-to-json-lc");
    var csvtojson= require("csvtojson");
    var request = require('request');
    var util= require('util');
    // util.promisify()
    app.use(bodyParser.json());  

    var storage = multer.diskStorage({ //multers disk storage settings
        destination: function (req, file, cb) {
            cb(null, './uploads/')
        },
        filename: function (req, file, cb) {
            var datetimestamp = Date.now();
            cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1])
        }
    });

    var upload = multer({ //multer settings
                    storage: storage,
                    fileFilter : function(req, file, callback) { //file filter
                        if (['xls', 'xlsx','csv'].indexOf(file.originalname.split('.')[file.originalname.split('.').length-1]) === -1) {
                            return callback(new Error('Wrong extension type'));
                        }
                        callback(null, true);
                    }
                }).single('file');


    /** API path that will upload the files */
    app.post('/upload', function(req, res) {
        var filetojson;
        upload(req,res,function(err){
            if(err){
                 res.json({error_code:1,err_desc:err});
                 return;
            }
            /** Multer gives us file info in req.file object */
            if(!req.file){
                res.json({error_code:1,err_desc:"No file passed"});
                return;
            }
            /** Check the extension of the incoming file and 
             *  use the appropriate module
             */
            var file_extension=req.file.originalname.split('.')[req.file.originalname.split('.').length-1];
            if(file_extension === 'xlsx'){
                filetojson = xlsxtojson;
            } else if(file_extension === 'csv') {
                filetojson = csvtojson;
            }else{
                filetojson= xlstojson;
            }
            console.log(req.file.path);
            try {
                var status;
                if(file_extension === 'csv'){
                    filetojson()
                    .fromFile(req.file.path)
                    .then((jsonObj)=>{
                           console.log(jsonObj);
                           request({
                            url: "http://127.0.0.1:8055/items/students",
                            method: "POST",
                            headers: {
                                'Authorization': 'Bearer qwert',
                                "content-type": "application/json"
                            },
                            body: JSON.stringify(jsonObj)
                           }, function(error, response, body) {
                               if (!error && response.statusCode == 200) {
                                   res.json({error_code:0,err_desc:null, data: "upload success"});
                                }else{
                                    res.json({error_code:1,err_desc:null, data: "upload failure"});
                                }
                            });
                        })
 
                }else{

                    filetojson({
                        input: req.file.path,
                        output: null, //since we don't need output.json
                        lowerCaseHeaders:true
                    }, function(err,result){
                        if(err) {
                            return res.json({error_code:1,err_desc:err, data: null});
                        } 
                        console.log(result);
                        request({
                            url: "http://127.0.0.1:8055/items/students",
                            method: "POST",
                            headers: {
                                'Authorization': 'Bearer qwert',
                                "content-type": "application/json"
                            },
                            body: JSON.stringify(result)
                        
                        }, function(error, response, body) {
                            if (!error && response.statusCode == 200) {
                                res.json({error_code:0,err_desc:null, data: "upload success"});
                            }else{
                                res.json({error_code:1,err_desc:null, data: "upload failure"});
                            }
                        }); 
                         
    
                        
    
                    });
                }

            } catch (e){
                res.json({error_code:1,err_desc:"Corupted excel file"});
            }
        })
       
    });
	
	app.get('/',function(req,res){
		res.sendFile(__dirname + "/index.html");
	});

    app.listen('3000', function(){
        console.log('running on 3000...');
    });