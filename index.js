const express = require('express')
const fs = require('fs')
const bodyParser = require('body-parser')
var morgan = require('morgan')
var path = require("path");
var rfs = require('rotating-file-stream')
var errorhandler = require('errorhandler')

let app = express();

app.use(errorhandler({ dumpExceptions: true, showStack: true, log: errorNotification })); 

function errorNotification (err, str, req) {
  var title = 'Error in ' + req.method + ' ' + req.url;

  console.log("Error in", req.method, req.url, str);
  console.log("---------query---------");
  console.log("%o", req.query);
  console.log("---------body ---------");
  console.log("%o", req.body);
  console.log("---------stack---------");
  console.log(err.stack);

}

// create a rotating write stream
var accessLogStream = rfs('access.log', {
  interval: '1d', // rotate daily
  path: path.join(__dirname, 'log')
})

// setup the logger
app.use(morgan('combined', { stream: accessLogStream }));

require('./src/helpers/blockchain-helper')(app)

let config
const configPath = './config.json'
const configExists = fs.existsSync(configPath, fs.F_OK)
if (configExists) {
	config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
} else {
	return console.log('There is no config.json file')
}
app.config = config

let web3
app.configureWeb3(config)
.then(web3 => {
	app.web3 = web3
	app.use(express.static(__dirname + '/public'))
	app.use(bodyParser.json({
		limit: '50mb',
	}))
	app.use(bodyParser.urlencoded({
		limit: '50mb',
		extended: true,
	}))

	require('./src/controllers/index')(app)

	app.get('/', function(request, response) {
	  response.send('Athereum Network faucet')
	});

	app.set('port', (process.env.PORT || 80))

	app.listen(app.get('port'), function () {
	    console.log('Athereum Network faucet is running on port', app.get('port'))
	})
})
.catch(error => {
	return console.log(error)
})
