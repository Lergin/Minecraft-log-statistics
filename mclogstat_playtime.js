'use strict';

class playTime {
	constructor() {
		this.dates;
		this.ranges = {};
	}

	addTime(startDate, endDate) {
		startDate = moment(startDate);
		endDate = moment(endDate);

		var startDateString = startDate.format('YYYY-MM-DD');
		var endDateString = endDate.format('YYYY-MM-DD');

		if (!this.ranges[startDateString]) {
			this.ranges[startDateString] = [];
		}

		if (startDate.isSame(endDate, 'day')) {
			this.ranges[startDateString].push(
				moment.range(startDate, endDate)
			);
		}else{
			this.ranges[startDateString].push(
				moment.range(startDate, startDate.endOf('Day'))
			);



			if (!this.ranges[endDateString]) {
				this.ranges[endDateString] = [];
			}

			this.ranges[endDateString].push(
				moment.range(endDate, endDate.startOf('Day'))
			);
		}


		this.dates = undefined;

	}

	getCompleteTime() {
		var playtimeObject = this.getDates();

		var completeTime = 0;


		Object.keys(playtimeObject).forEach(function (key) {
			if (key !== 'NaN-NaN-NaN') {
				completeTime += playtimeObject[key].time;
			}
		});

		return completeTime;
	}

	getDates() {
		if(this.dates){
			this.dates
		}

		var ranges = this.ranges;
		var dates = {};

		Object.keys(ranges).forEach(function(key){

			var startCurrRange;
			var endCurrRange;

			var newRanges = [];

			var currRanges = ranges[key].sort(function(range, range2){
				return range.toDate()[0] - range2.toDate()[1];
			})

			currRanges.forEach(function(range, index){
				if (!startCurrRange) {
					startCurrRange = range.toDate()[0]
					endCurrRange = range.toDate()[1]
				}else if(endCurrRange >= range.toDate()[0]){
					endCurrRange = (range.toDate()[1] > endCurrRange)?range.toDate()[1]:endCurrRange
				}else{
					newRanges.push([startCurrRange, endCurrRange])
					startCurrRange = range.toDate()[0]
					endCurrRange = range.toDate()[1]
				}

				if(index+1 == currRanges.length){
					newRanges.push([startCurrRange, endCurrRange])
				}
			});

			dates[key] = {};
			dates[key].time = 0;

			newRanges.forEach(function(range, index){
				dates[key].time += moment(range[1]).diff(
					moment(range[0])
				);
			});
		});

		this.dates = dates;

		return dates;
	}
}

playTime.formatTime = function(time){
	if(time == 0){
		return "0 minutes";
	}else if(time <= 1000){
		return time + " milliseconds"
	}else if(time <= 60 * 1000){
		return (time / 1000).toFixed(2) + " seconds"
	}else if(time <= 60*60*1000){
		return (time / (60*1000)).toFixed(2) + " minutes"
	}else if(time <= 24*60*60*1000){
		return (time / (60*60*1000)).toFixed(2) + " hours"
	}else{
		return (time / (24*60*60*1000)).toFixed(2) + " days"
	}
}
