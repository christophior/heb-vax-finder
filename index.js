#!/usr/bin/env node
const axios = require("axios");
const ora = require("ora");
const { program } = require("commander");
const open = require("open");

const package = require("./package.json");

program
	.version(package.version)
	.description(
		`a command line tool to help find a vaccination appointment at your local H-E-B\n------------------------------------------------------------\nplease use https://www.latlong.net/ to figure out your coordinates`
	)
	.option("-lat, --latitude <latitude>", "float argument", parseFloat, 30.25005)
	.option("-lon, --longitude <longitude>", "float argument", parseFloat, -97.859123)
	.option("-d, --distance <distance>", "float argument", parseFloat, 50);

program.parse(process.argv);
const options = program.opts();

// https://www.latlong.net/ for 78735
const { latitude, longitude, distance: distanceThreshhold } = options;

const spinner = ora(
	`searching for appointments within ${distanceThreshhold} miles of ${latitude}, ${longitude}`
).start();

let watcher;

const calcDistance = (lat, lon) => {
	if (lat == latitude && lon == longitude) {
		return 0;
	} else {
		var radlat = (Math.PI * lat) / 180;
		var radlat2 = (Math.PI * latitude) / 180;
		var theta = lon - longitude;
		var radtheta = (Math.PI * theta) / 180;
		var dist =
			Math.sin(radlat) * Math.sin(radlat2) +
			Math.cos(radlat) * Math.cos(radlat2) * Math.cos(radtheta);
		if (dist > 1) {
			dist = 1;
		}
		dist = Math.acos(dist);
		dist = (dist * 180) / Math.PI;
		dist = dist * 60 * 1.1515;

		return dist;
	}
};

const watch = async () => {
	const {
		data: { locations },
	} = await axios.get("https://heb-ecom-covid-vaccine.hebdigital-prd.com/vaccine_locations.json");

	const filteredVaxLocations = locations.filter(
		(v) => v.slotDetails.length > 0 && v.latitude && v.longitude
	);
	const vaxLocationsWithDistance = filteredVaxLocations.map((l) => {
		const distance = calcDistance(l.latitude, l.longitude);
		return {
			...l,
			distance,
		};
	});

	const vaxLocations = vaxLocationsWithDistance.filter((v) => v.distance <= distanceThreshhold);

	if (vaxLocations.length > 0) {
		const [foundLocation] = vaxLocations;
		const { name, city, distance, slotDetails, url } = foundLocation;
		spinner.stop();
		console.log(
			JSON.stringify(
				{
					name,
					city,
					distance,
					slotDetails,
				},
				null,
				"  "
			)
		);
		await open(url);
		clearInterval(watcher);
	}
};

watcher = setInterval(() => {
	watch();
}, 500);
