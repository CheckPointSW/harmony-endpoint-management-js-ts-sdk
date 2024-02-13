/* eslint-disable no-useless-escape */
/* eslint-disable no-multi-str */
/* eslint-disable import/no-extraneous-dependencies */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const nodeFetch = require('node-fetch');

if (fs.existsSync('./.env')) {
	dotenv.config({
		path: '.env',
	});
}

// The API owner
const API_SPEC_OWNER = 'Check-Point';

const BRANCH_NAME = process.env.CI_COMMIT_REF_NAME || process.env.BRANCH_NAME;

console.log(`[fetch-api] Set ${BRANCH_NAME} as CI/CD branch`);
console.log(`[fetch-api] Set ${process.env.BUILD_JOB_ID} as CI/CD job id`);


// #region Commons
// Build API based on develop branch, unless it's build for main branch, then use main branch API.
const CLOUD_SPEC_NAME = process.env.CLOUD_SPEC_NAME || 'web-mgmt-external-api-production';
const PREMISE_SPEC_NAME = process.env.PREMISE_SPEC_NAME || 'web-mgmt-external-api-premise';
const SAAS_SPEC_NAME = process.env.SAAS_SPEC_NAME || 'harmony-endpoint-cloud-api-prod';

console.log(`[fetch-api] The spec for cloud is ${CLOUD_SPEC_NAME} for "${BRANCH_NAME}"`);
console.log(`[fetch-api] The spec for premise is ${PREMISE_SPEC_NAME} for "${BRANCH_NAME}"`);
console.log(`[fetch-api] The spec for saas is ${SAAS_SPEC_NAME} for "${BRANCH_NAME}"`);


const LOCAL_GENERATED_API_PATH = process.env.LOCAL_GENERATED_API_PATH;
const LOCAL_PREMISE_GENERATED_API_PATH = process.env.LOCAL_PREMISE_GENERATED_API_PATH;
const LOCAL_SAAS_GENERATED_API_PATH = process.env.LOCAL_PREMISE_GENERATED_API_PATH;

if (LOCAL_GENERATED_API_PATH) {
	console.log(`[fetch-api] Generating API using local generated API ...`);
} 

if (LOCAL_PREMISE_GENERATED_API_PATH) {
	console.log(`[fetch-api] Generating Premise API using local generated API ...`);
}

if (LOCAL_SAAS_GENERATED_API_PATH) {
	console.log(`[fetch-api] Generating SaaS API using local generated API ...`);
}

const SWAGGERHUB_API_KEY = process.env.SWAGGERHUB_API_KEY;

const swaggerHeaders = {
	'Content-Type': 'application/json',
};

if (SWAGGERHUB_API_KEY) {
	swaggerHeaders.Authorization = `Bearer ${SWAGGERHUB_API_KEY}`;
}


// #endregion Commons

const SWAGGER_CONF = 'swagger.json';
// #endregion Swagger File Names


// #region Output Paths
const OUTPUT_BASE_PATH = 'src/generated/specs';

/**
 * Recursively ensures the given directory path exists, creating it as necessary
 *
 * @param {string} dirPath The path to ensure
 * @return {void}
 */
function mkdirRecursive(dirPath) {
	if (fs.existsSync(dirPath)) {
		return;
	}
	const dirname = path.dirname(dirPath);
	mkdirRecursive(dirname);
	fs.mkdirSync(dirPath);
}

/**
 * Writes file content to the file in the appropriate root path
 *
 * @param {string} apiRootPath - root path of API
 * @param {string} fileName - the name of the file to write
 * @param {string} fileContent - content that is going to be written to file
 */
async function depositFile(apiRootPath, fileName, fileContent) {
	fs.writeFileSync(path.join(apiRootPath, fileName), fileContent);
}

async function downloadSpec(spec) {

	console.log(`[fetch-api] Fetching API versions form SwaggerHub...`);

	// Fetch all available versions from SwaggerHub API
	const allSpecsRes = await nodeFetch(`https://api.swaggerhub.com/apis/${API_SPEC_OWNER}/${spec}`, {
		method: 'GET',
		headers: swaggerHeaders,
	});
	// Get info as JSON
	const allSpecs = await allSpecsRes.json();

	// Get the latest API available
	const latestVersionInfo = allSpecs.apis[allSpecs.apis.length - 1];

	// Find the SWagger property, where there is the URL to the spec 
	const latestVersionUrl = latestVersionInfo.properties.find(prop => prop.type === 'Swagger')?.url;

	console.log(`[fetch-api] Fetching API Spec form SwaggerHub URL "${latestVersionUrl}"`);

	// Fetch the spec
	const latestSpecRes = await nodeFetch(latestVersionUrl, {
		method: 'GET',
		headers: swaggerHeaders,
	});
	// Get spec as JSON
	const latestSpec = await latestSpecRes.json();

	return latestSpec;
}

async function readLocalFile(root, fileName) {
	try {
		return fs.readFileSync(path.join(root, fileName)).toString('utf-8');
	} catch (error) {
		console.error(`[fetch-api] Error while trying read local file ${fileName}`, error);
	}
}

/**
 * Downloads swagger.json file from LOCAL path if it is defined in .env file or from Artifactory
 *
 * @param {string} type - API type
 * @param {string} localSwaggerPath - local swagger path from .env file
 * @param {string} artifactoryProject - API project name
 * @return {Promise<*>}
 */
async function getSwaggerConfig(localSwaggerPath, spec, dist) {
	console.log(`[fetch-api] Getting swagger config for data from ${localSwaggerPath ? 'LOCAL' : 'ARTIFACTORY'}`);
	const swaggerSpec = localSwaggerPath ?
		(await readLocalFile(localSwaggerPath, SWAGGER_CONF)) : (await downloadSpec(spec));

	const content = localSwaggerPath ? JSON.parse(swaggerSpec) : swaggerSpec;

	// Due to a bug in TS OpenAPI generator, all onOf that includes job result are generated as job results interface, only...
	// So in the following code, we removing all OR JOB RESULT object with the original only

	for (const [schemaName, schema] of Object.entries(content.components.schemas)) {
		if (!schema?.oneOf || schema?.oneOf?.length !== 2) {
			continue;
		}
		const jobSchemaIndex = schema.oneOf.findIndex(s => s?.$ref === '#/components/schemas/JobCreationResult');

		if (jobSchemaIndex === -1) {
			continue;
		}

		schema.oneOf.splice(jobSchemaIndex, 1);
		const originalRes = { ...schema.oneOf[0] };
		delete schema.oneOf;

		for (const [itemName, item] of Object.entries(originalRes)) {
			schema[itemName] = item;
		}
	}

	const swagger = JSON.stringify(content);
	console.log(`[fetch-api] Swagger.json (content length - ${swagger.length}) was successfully retrieved for data. Saving it to ${OUTPUT_BASE_PATH}`);

	const finalDist = `${OUTPUT_BASE_PATH}/${dist}`;
	mkdirRecursive(finalDist);
	await depositFile(finalDist, SWAGGER_CONF, swagger);
	await depositFile(finalDist, 'spec', spec);
}

(async () => {
	// Make sure the output directory exists
	mkdirRecursive(OUTPUT_BASE_PATH);

	// Downloads swagger.conf from LOCAL or ARTIFACTORY
	await getSwaggerConfig(LOCAL_GENERATED_API_PATH, CLOUD_SPEC_NAME, 'cloud');
	// TODO: Open when on-premise will be release to public
	// await getSwaggerConfig(LOCAL_PREMISE_GENERATED_API_PATH, PREMISE_SPEC_NAME, 'premise');
	await getSwaggerConfig(LOCAL_SAAS_GENERATED_API_PATH, SAAS_SPEC_NAME, 'saas');
})();
