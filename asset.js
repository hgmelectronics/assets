#!/usr/bin/env node

const program = require('commander');

const yaml = require('js-yaml');
const path = require('path');
const mkdirp = require('mkdirp');
const fs = require('fs');
const rimraf = require('rimraf');

const globalDebug = false;

const baseURL = 'com.hgmelectronics.flash.cs.binary://assets.hgmelectronics.com/software';

const emptyIndex = {
	softwareVersions: [],
	devices: {}
}

function softwareIndexHtml(versionURL) {
	return `<html>
<head>
	<meta http-equiv='refresh' content='0; url=${versionURL}'>
</head>
<body>
	<h1>
		<a href='${versionURL}'>Open manually</a>
	</h1>
	<script>
		window.location.replace('${versionURL}');
	</script>
</body>
</html>
`;
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
		if (fs.existsSync(indexPath)) {
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
	const filePath = path.join(devPath, 'index.json');

	mkdirp.sync(devPath);

	const deviceRecord = {
		serialNumber: serialNumber,
		product: product,
		assignedVersion: softwareVersion,
		model: model
	};

	fs.writeFileSync(filePath, JSON.stringify(deviceRecord));
}

function createDevices(devices) {
	rimraf.sync('devices');
	for (const serialNumber of Object.keys(devices)) {
		const deviceData = devices[serialNumber];
		createDevice(serialNumber, deviceData);
	}
}

function copySoftware(product, model, version) {
	const srcFile = product + '-' + model + '-' + version + '.srec';
	const srcPath = path.join('.hgm', product, srcFile)
	const destPath = path.join('software', product, model, version, 'binary');
	fs.copyFileSync(srcPath, destPath);
}

function createSoftwareVersion(product, model, version, versionData) {
	const releaseDate = versionData.releaseDate;
	const changelog = versionData.changelog;
	const dirPath = path.join('software', product, model, version);
	const indexHtmlFile = path.join(dirPath, 'index.html');
	const metadataDir = path.join(dirPath, 'metadata');
	const metadataFile = path.join(metadataDir, 'index.json');

	mkdirp.sync(metadataDir);

	const softwareMetadata = {
		product: product,
		model: model,
		version: version,
		releaseDate: releaseDate,
		changelog: changelog
	};

	let versionURL = baseURL + '/' + product + '/' + model + '/' + version + '/binary';

	fs.writeFileSync(metadataFile, JSON.stringify(softwareMetadata));
	const indexHtml = softwareIndexHtml(versionURL);
	fs.writeFileSync(indexHtmlFile, indexHtml);

	copySoftware(product, model, version);
}

function createSoftware(software) {
	rimraf.sync('software');
	for (const product of Object.keys(software)) {
		const models = software[product];
		for (const model of Object.keys(models)) {
			const versions = models[model];
			for (const version of Object.keys(versions)) {
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
