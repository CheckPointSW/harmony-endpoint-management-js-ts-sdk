/* eslint-disable no-useless-escape */
/* eslint-disable no-multi-str */
/* eslint-disable import/no-extraneous-dependencies */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

if (fs.existsSync('./.env')) {
	dotenv.config({
		path: '.env',
	});
}

function replaceStringInFile(filePath, searchStr, replaceStr) {
	// Read the file synchronously
	let data = fs.readFileSync(filePath, 'utf8');
  
	// Perform the string replacement
	data = data.replace(searchStr, replaceStr);
  
	// Write the updated data back to the file synchronously
	fs.writeFileSync(filePath, data, 'utf8');
}
  
console.log(`[post-generate-api] Removing index.ts from the generated file, to avoid circular dependencies`);
const OUTPUT_BASE_PATH = 'src/generated';

fs.unlinkSync(`${OUTPUT_BASE_PATH}/cloud/swagger/index.ts`);
// TODO: Open when on-premise will be release to public
// fs.unlinkSync(`${OUTPUT_BASE_PATH}/premise/swagger/index.ts`);
fs.unlinkSync(`${OUTPUT_BASE_PATH}/saas/swagger/index.ts`);

console.log(`[post-generate-api] Removing index.ts from the generated file, finished`);


console.log(`[post-generate-api] Preparing build info manifest`);

fs.writeFileSync(`${OUTPUT_BASE_PATH}/cloud/build.json`, JSON.stringify({ spec: fs.readFileSync(`${OUTPUT_BASE_PATH}/specs/cloud/spec`, 'utf8') ,build: process.env.BUILD_JOB_ID || '', releasedOn: new Date().toISOString() }));
// TODO: Open when on-premise will be release to public
// fs.writeFileSync(`${OUTPUT_BASE_PATH}/premise/build.json`, JSON.stringify({ spec: fs.readFileSync(`${OUTPUT_BASE_PATH}/specs/premise/spec`, 'utf8') ,build: process.env.BUILD_JOB_ID || '', releasedOn: new Date().toISOString() }));
fs.writeFileSync(`${OUTPUT_BASE_PATH}/saas/build.json`, JSON.stringify({ spec: fs.readFileSync(`${OUTPUT_BASE_PATH}/specs/saas/spec`, 'utf8') ,build: process.env.BUILD_JOB_ID || '', releasedOn: new Date().toISOString() }));

console.log(`[post-generate-api] Build info manifest is ready`);


console.log(`[post-generate-api] coping specs to dist...`);
fs.copyFileSync(`${OUTPUT_BASE_PATH}/specs/cloud/swagger.json`, `${OUTPUT_BASE_PATH}/cloud/swagger.json`);
// TODO: Open when on-premise will be release to public
// fs.copyFileSync(`${OUTPUT_BASE_PATH}/specs/premise/swagger.json`, `${OUTPUT_BASE_PATH}/premise/swagger.json`);
fs.copyFileSync(`${OUTPUT_BASE_PATH}/specs/saas/swagger.json`, `${OUTPUT_BASE_PATH}/saas/swagger.json`);

console.log(`[post-generate-api] coping specs to dist done`);

// Manually and hard-coded set session management to be private and to be used by SDK internally only.
console.log(`[post-generate-api] Set session management to be private`);
replaceStringInFile(`${OUTPUT_BASE_PATH}/cloud/swagger/api.ts`, 'public readonly SessionApi =', 'protected readonly SessionApi =');
// TODO: Open when on-premise will be release to public
// replaceStringInFile(`${OUTPUT_BASE_PATH}/premise/swagger/api.ts`, 'public readonly SessionApi =', 'protected readonly SessionApi =');
replaceStringInFile(`${OUTPUT_BASE_PATH}/saas/swagger/api.ts`, 'public readonly ManageSessionApi =', 'protected readonly ManageSessionApi =');
console.log(`[post-generate-api] Set session management to be private done`);
