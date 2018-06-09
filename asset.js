#!/usr/bin/env node
//require('json5/lib/register');
//require('yamlify/register');

const json = require('json5');
const colors = require('ansi-colors');
const program = require('commander');

//const gulp = require('gulp');
//const changed = require('gulp-changed');
//const data = require('gulp-data');
//const hb = require('gulp-hb');
//const print = require('gulp-print').default;
//const rename = require('gulp-rename');

const handlebars = require('handlebars');
const yaml = require('js-yaml');
const path = require('path');
const through = require('through2');
const mkdirp = require('mkdirp');
const fs = require('fs');
const rimraf = require('rimraf');

const globalDebug = false;

const baseURL = 'com.hgmelectronics.flash.cs.binary://assets.hgmelectronics.com/software';

const launchFlashTemplate = "\
	<html>\
	<head>\
		<meta http-equiv='refresh' content='0; url='{{url}}'>\
	</head>\
	<body>\
		<h1>\
			<a href='{{url}}'>Open manually</a>\
		</h1>\
		<script>\
			window.location.replace('{{url}}');\
		</script>\
	</body>\
	</html>";




const emptyIndex = {
		softwareVersions: [],
		devices: {}
}

function saveIndex(index) {
	fs.writeFileSync(getIndexPath(), yaml.safeDump(index));
}


function getIndexPath() {
	return path.join('.', '.hgm/assets.yaml');
}


function loadIndex() {
	return yaml.safeLoad(fs.readFileSync(getIndexPath()));
}

program.option('-d');

program.command('init')
.action(() => {
	const indexPath = path.join('.', '.hgm/assets.yaml');
	if(fs.existsSync(indexPath)) {
		throw new Error("assets index already exists");
	}
	mkdirp.sync('.hgm');

	saveIndex(emptyIndex);
});


function createDevice(serialNumber, device) {
	const product = device.product;
	const softwareVersion = device.softwareVersion;
	const model = device.model;
	const devPath = path.join('devices', serialNumber);
	const filePath = path.join(devPath,'index.json');

	mkdirp.sync(devPath);

	const deviceRecord = {
			serialNumber: serialNumber,
			product: product,
			assignedVersion: softwareVersion,
			model: model };

	fs.writeFileSync(filePath, json.stringify(deviceRecord));

}

function createDevices(devices) {
	rimraf.sync('devices');
	for(let device in devices) {
		const deviceData = devices[device];
		createDevice(device, deviceData);
	}
}



function copySoftware(product, model, version) {
	const srcFile = model + '-' + version + '.srec';
	const srcPath = path.join('.hgm',product, srcFile)
	const destPath = path.join('software',product,model,version,'binary');
	fs.copyFileSync(srcPath, destPath);
}

function createSoftwareVersion(product, model, version, versionData) {
	const releaseDate = versionData.releaseDate;
	const changeLog = versionData.changeLog;
	const dirPath = path.join('software',product,model,version);
	const indexHtmlFile = path.join(dirPath, 'index.html');
	const metadataDir = path.join(dirPath,'metadata');
	const metadataFile = path.join(metadataDir,'index.json');

	mkdirp.sync(metadataDir);

	const softwareMetadata = {
			product: product,
			model: model,
			version: version,
			releaseDate: releaseDate,
			changeLog: changeLog
	};

	let versionURL = baseURL + '/' + product + '/' + model + '/' + version + '/binary';

	fs.writeFileSync(metadataFile, json.stringify(softwareMetadata));
	let template = handlebars.compile(launchFlashTemplate);
	let data = { url: versionURL };
	fs.writeFileSync(indexHtmlFile, template(data));

	copySoftware(product, model, version);
}

function createSoftware(software) {
	rimraf.sync('software');
	for(let product in software) {
		const models = software[product];
		for(let model in models) {
			const versions = models[model];
			for(let version in versions) {
				const versionData = versions[version];
				createSoftwareVersion(product, model, version, versionData);
			}
		}
	}
}


program.command('build')
.action(() => {
	const index = loadIndex();
	createDevices(index.devices);
	createSoftware(index.software);
});


//program.command('addDevice <product> <model> <serial-number> [softwareRevision]')
//.action((product, model, serialNumber, software, cmd) => {
//});
//
//program.command('set-software <product> <softwareRevision> [serialNumbers...]')
//.action((product, serialNumbers, cmd) =>{
//
//});
//
//program.command('set-model <product> <model> [serialNumbers...]')
//.action((software, serialNumbers, cmd) =>{
//
//});
//
//program.command('rm <serial-number>')
//.action((sn, cmd) =>{
//});

program.parse(process.argv);




