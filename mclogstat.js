'use strict';

var logs = [];
var playTimeDays = [];
var chartsDrawed = false;
var generellPlaytime = new playTime();
var serverPlaytime = new playTime();
var spPlaytime = new playTime();
var template = document.getElementById('mc-log-stat');
var serverTemplate = document.getElementById('mc-log-stat-server');
var playtimeTemplate = document.getElementById('mc-log-stat-playtime');
var linechart_playtimeDate;
var linechart_playtimeDate_data;
var linechart_playtimeDate_dashboard;
var PlayTimesServer = [];
var PlayTimesSp = [];

serverTemplate.outher_server_table_columns = [
	{
		title: 'IP',
		number: false,
		column: 'ip',
		hidden: false
	},{
		title: 'Port',
		number: false,
		column: 'port',
		hidden: false
	},{
		title: 'Joins',
		number: true,
		column: 'amount',
		hidden: false
	},{
		title: 'Playtime',
		number: true,
		column: 'time',
		hidden: false,
		formatter: function(time){
			return playTime.formatTime(time);
		}
	}
]


window.onresize = function(){
	drawChart()
};

function drawChart() {
	linechart_playtimeDate_dashboard = new google.visualization.Dashboard(
			document.getElementById('chartRangeFilter_dashboard_div'));

	var control = new google.visualization.ControlWrapper({
		'controlType': 'ChartRangeFilter',
		'containerId': 'chartRangeFilter_control_div',
		'options': {
			'filterColumnIndex': 0,
			'ui': {
				'chartType': 'Line',
				'chartOptions': {
					'chartArea': {'width': '95%'},
				},
				'minRangeSize': 86400000 * 3
			}
		},
	});

	var chart = new google.visualization.ChartWrapper({
		'chartType': 'Line',
		'containerId': 'chartRangeFilter_chart_div',
		'options': {
			'legend': {'position': 'bottom'},
			'chart': {
				'title': 'Minecraft Playtime',
				'subtitle': 'in hours'
			}
		}
	});

	var linechart_playtimeDate_data = new google.visualization.DataTable();
	linechart_playtimeDate_data.addColumn('date', 'Date');
	linechart_playtimeDate_data.addColumn('number', 'Playtime');
	linechart_playtimeDate_data.addColumn('number', 'Playtime Server');
	linechart_playtimeDate_data.addColumn('number', 'Playtime SinglePlayer');
	linechart_playtimeDate_data.addRows(playTimeDays);


	linechart_playtimeDate_dashboard.bind(control, chart);
	linechart_playtimeDate_dashboard.draw(linechart_playtimeDate_data);

	chartsDrawed = true;
}

function handleFileSelect(evt) {
	var files = evt.target.files;
	var filesReady = 0;
	
	logs = [];
	playTimeDays = [];
	chartsDrawed = false;
	generellPlaytime = new playTime();
	serverPlaytime = new playTime();
	spPlaytime = new playTime();
	PlayTimesServer = [];
	PlayTimesSp = [];
	
	template.files = files.length;
	template.progress = 0;
	
	for (var i = 0, f; f = files[i]; i++) {
		if (f.type == 'application/x-gzip' && f.size < 10000) {
			var reader = new FileReader();

			reader.onload = (function (file) {
				return function (e) {
					var log = {
						messages: phraseLog(loadCompressedFile(e.target.result)),
						endDate: new Date(
							file.name.substr(0, 4),
							file.name.substr(5, 2) - 1,
							file.name.substr(8, 2),
							0,
							0,
							0,
							0
						)
					}

					if (getPlayTime(log) < 60 * 60 * 24) {
						logs.push(log);

						generellPlaytime.addTime(log.startDate, log.endDate);
						getPlayTimeByType(log);
					}


					filesReady++;
					template.progress++

					if (filesReady >= files.length) {
						var playtimes = {};

						playtimes.all = generellPlaytime.getCompleteTime();
						playtimes.mp = serverPlaytime.getCompleteTime();
						playtimes.sp = spPlaytime.getCompleteTime();

						Object.keys(playtimes).forEach(function(key){
							playtimes[key] = playTime.formatTime(playtimes[key]);
						});

						playtimeTemplate.playtimes = playtimes;

						getServer(logs);

						playTimeDays = getPlayTimeByDay(logs);

						document.getElementById('res').style.display = 'block';

						drawChart();

					}
				};
			})(f);

			reader.readAsBinaryString(f);
		} else {
			filesReady++;
			template.progress++


			if (filesReady >= files.length - 1) {
				var playtimes = {};

				playtimes.all = generellPlaytime.getCompleteTime();
				playtimes.mp = serverPlaytime.getCompleteTime();
				playtimes.sp = spPlaytime.getCompleteTime();

				Object.keys(playtimes).forEach(function(key){
					playtimes[key] = playTime.formatTime(playtimes[key]);
				});

				playtimeTemplate.playtimes = playtimes;

				getServer(logs);

				playTimeDays = getPlayTimeByDay(logs);

				document.getElementById('res').style.display = 'block';

				drawChart();
			}
		}
	}
}

document.getElementById('files').addEventListener('change', handleFileSelect, false);

var loadCompressedFile = function (rawfile) {
	var bytes = [];

	for (var fileidx = 0; fileidx < rawfile.length; fileidx++) {
		var abyte = rawfile.charCodeAt(fileidx) & 0xff;
		bytes.push(abyte);
	}

	var gunzip = new Zlib.Gunzip(bytes);
	var plain = gunzip.decompress ();

	var string = "";
	for (var i = 0; i < plain.length; i++) {
		string += String.fromCharCode(plain[i]);
	}

	return string;
}

var phraseLog = function (log) {
	var phrasedLog = [];

	log.split(/\n/).forEach(function (line) {
		if (line.length > 0 && line.match(/\[(\d|:){8}]/)) {
			var phrasedLine = {
				time: line.substr(1, 8),
				thread: line.substr(12).split(/\//)[0],
				status: line.substr(12).split(/\//)[1].split(/]/)[0],
				type: 'system'
			}

			var arr = line.split(/:/);
			arr.splice(0, 3);

			phrasedLine.message = arr.join(':').substr(1);

			if (phrasedLine.message.match(/\[CHAT]/)) {
				phrasedLine.message = phrasedLine.message.substr(7);
				phrasedLine.type = 'chat';
			}

			phrasedLog.push(phrasedLine);
		}
	})

	return phrasedLog
}


function getPlayTime(log) {
	if (log.playTime) {
		return log.playTime
	}

	var lastLog = moment(log.messages[log.messages.length - 1].time, "HH:mm:ss");
	var firstLog = moment(log.messages[0].time, "HH:mm:ss");

	lastLog.set({'year': log.endDate.getFullYear(), 'month': log.endDate.getMonth(), 'date': log.endDate.getDate()})
	firstLog.set({'year': log.endDate.getFullYear(), 'month': log.endDate.getMonth(), 'date': log.endDate.getDate()})

	if (lastLog.isBefore(firstLog)) {
		firstLog.subtract(1, 'days');
	}

	log.endDate = lastLog;
	log.startDate = firstLog;
	log.playTime = lastLog.diff(firstLog, 'seconds');
	log.range = moment.range(firstLog, lastLog);

	return log.playTime;
}

function getServer(logs) {
	var server = [];
	logs.forEach(function (log) {
		log.messages.forEach(function (message) {
			if (message.type !== 'chat' && message.status == 'INFO' && message.message.match(/.*Connecting to.*/)) {
				var ip = message.message.substr(14).split(/,/)[0].split(/ /);

				ip = ip[ip.length - 1];

				if (ip.substring(ip.length-1) == ".") {
					ip = ip.substring(0, ip.length-1);
				}

				var port = message.message.split(/,/)[1];
				port = port.substr(1,port.length-2);

				var newServer = {
					ip: ip,
					port: port
				}

				server.some(function (testServer) {
					if (testServer.ip == newServer.ip && testServer.port == newServer.port) {
						testServer.amount++;
						newServer = undefined;
						return true;
					}
					return false;
				});

				if (newServer !== undefined) {
					newServer.amount = 1;
					server.push(newServer);
				}
			}
		});
	});


	var top_server = [];
	var outher_server = [];

	server.forEach(function (testServer) {
		var playtimeObj = new playTime();

		PlayTimesServer.forEach(function(serverPlayTime){
			if(serverPlayTime.ip == testServer.ip && serverPlayTime.port == testServer.port){
				playtimeObj.addTime(serverPlayTime.startTime.valueOf(), serverPlayTime.endTime.valueOf());
			}
		})

		testServer.time = playtimeObj.getCompleteTime();
	});

	server.sort(function(a,b){
		return b.time - a.time;
	}).forEach(function(testServer){
		if (top_server.length < 5) {
			top_server.push(testServer);
		}

		outher_server.push(testServer);
	})

	serverTemplate.top_servers = top_server;
	serverTemplate.outher_servers = outher_server;

	return server;
}

Date.prototype.toDbDateString = function () {
	var yyyy = this.getFullYear().toString();
	var mm = (this.getMonth() + 1).toString();
	var dd = this.getDate().toString();
	return yyyy + "-" + (mm[1] ? mm : "0" + mm[0]) + "-" + (dd[1] ? dd : "0" + dd[0]);
}

function getPlayTimeByType(log) {
	var logStartDate = moment(log.startDate);
	var logEndDate = moment(log.endDate);
	var currentGame;

	log.messages.forEach(function (message, index) {
		if (message.type !== 'chat' && message.status == 'INFO') {
			if (currentGame && (
					message.message.match(/.*Connecting to.*/) ||
					message.message.match(/.*Starting integrated minecraft server.*/) ||
					message.message.match(/Stopping!/)
				)
			) {
				var endDate = moment(message.time, "HH:mm:ss");
				var startDate = currentGame.startTime;

				endDate.set({
					'year': log.endDate.year(),
					'month': log.endDate.month(),
					'date': log.endDate.date()
				});
				startDate.set({
					'year': log.endDate.year(),
					'month': log.endDate.month(),
					'date': log.endDate.date()
				});

				if (endDate.isBefore(startDate)) {
					startDate.subtract(1, 'days');
				}

				PlayTimesServer.push({
					ip: currentGame.ip,
					port: currentGame.port,
					startTime: startDate,
					endTime: endDate
				});

				currentGame = undefined;
			}

			if (currentGame && message.message.match(/Saving worlds/)) {
				var endDate = moment(message.time, "HH:mm:ss");
				var startDate = currentGame.startTime;

				endDate.set({
					'year': log.endDate.year(),
					'month': log.endDate.month(),
					'date': log.endDate.date()
				});
				startDate.set({
					'year': log.endDate.year(),
					'month': log.endDate.month(),
					'date': log.endDate.date()
				});

				if (endDate.isBefore(startDate)) {
					startDate.subtract(1, 'days');
				}

				PlayTimesSp.push({
					startTime: startDate,
					version: currentGame.version,
					endTime: endDate,
					world: log.messages[index + 1].message.split(/'/)[1]
				});

				currentGame = undefined;
			} else if (message.message.match(/.*Starting integrated minecraft server.*/)) {
				currentGame = {
					type: 'SinglePlayer',
					startTime: moment(message.time, "HH:mm:ss"),
					version: message.message.substr(45)
				}
			} else if (message.message.match(/.*Connecting to.*/)) {
				currentGame = {
					ip: message.message.substr(14).split(/,/)[0].split(/ /),
					port: message.message.split(/,/)[1],
					startTime: moment(message.time, "HH:mm:ss"),
					type: 'MultiPlayer'
				}

				currentGame.ip = currentGame.ip[currentGame.ip.length - 1];

				if (currentGame.ip.substring(currentGame.ip.length-1) == ".") {
					currentGame.ip = currentGame.ip.substring(0, currentGame.ip.length-1);
				}

				currentGame.port = currentGame.port.substr(1,currentGame.port.length-2);
			}
		}
	});

	PlayTimesServer.forEach(function (game) {
		serverPlaytime.addTime(game.startTime.valueOf(), game.endTime.valueOf());
	});

	PlayTimesSp.forEach(function (game) {
		spPlaytime.addTime(game.startTime.valueOf(), game.endTime.valueOf());
	});
}

function getPlayTimeByDay(logs) {
	var days = [];
	var lastKey = undefined;

	var PlaytimeObject = generellPlaytime.getDates();


	var playtimeServer = serverPlaytime.getDates();
	var playtimeSp = spPlaytime.getDates();

	Object.keys(playtimeServer).forEach(function (key) {
		if (!PlaytimeObject[key]) {
			PlaytimeObject[key] = {};
		}

		PlaytimeObject[key].server = playtimeServer[key].time;
	});

	Object.keys(playtimeSp).forEach(function (key) {
		if (!PlaytimeObject[key]) {
			PlaytimeObject[key] = {};
		}

		PlaytimeObject[key].sp = playtimeSp[key].time;
	});

	Object.keys(PlaytimeObject).sort().forEach(function (key) {
		if (key !== 'NaN-NaN-NaN') {
			if (lastKey !== undefined) {
				var lastDay = new Date(lastKey.split(/-/)[0], lastKey.split(/-/)[1] - 1, lastKey.split(/-/)[2]);
				lastDay.setDate(lastDay.getDate() + 1)

				while (!(lastDay.toDbDateString() === key)) {
					lastDay.setDate(lastDay.getDate() + 1)

					days.push([
						new Date(lastDay),
						0,
						0,
						0
					])
				}
			} else {
				lastKey = key;
			}


			if (!PlaytimeObject[key].time) {
				PlaytimeObject[key].time = 0
			}

			if (!PlaytimeObject[key].server) {
				PlaytimeObject[key].server = 0
			}

			if (!PlaytimeObject[key].sp) {
				PlaytimeObject[key].sp = 0
			}

			days.push([
				new Date(key.split(/-/)[0], key.split(/-/)[1] - 1, key.split(/-/)[2]),
				PlaytimeObject[key].time / 1000 / 60 / 60 ,
				PlaytimeObject[key].server / 1000 / 60 / 60,
				PlaytimeObject[key].sp / 1000 / 60 / 60
			]);

			lastKey = key;
		}
	});
	return days;
};

var getDateByDateAndMessage = function (date, message) {
	return new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
		message.substr(0, 2),
		message.substr(3, 2),
		message.substr(6, 2),
		0
	);
}

serverTemplate.computeRequestParamsIp = function(ip,port){
	var url = {
		"url": "http://api.minetools.eu/ping/" + ip + "/" + port
	};

	return url;
}

serverTemplate.computeServerIp = function(ip,port){
	if(port == 25565){
		return ip;
	}

	return ip + ":" + port;
}



serverTemplate.mcFormat = function(string){
	if(string){
		return string.replace(/\xA7[0-9a-fA-Fk-orK-OR]/g, '')
	}

	return "offline"
}

serverTemplate.serverIcon = function(img){
	if(img){
		return img;
	}

	return "/images/unknown_server.png"
}

serverTemplate.formatTime = function(time){
	return playTime.formatTime(time);
}



