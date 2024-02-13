import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import { HarmonyEndpoint, HarmonyEndpointSaaS, InfinityPortalAuth } from '../src/index';
import { logger, errorLogger } from '../src/core/debug.logger';

// load environment variable from .env file before all
if (existsSync('.env')) {
	dotenv.config();
}

export const he = new HarmonyEndpoint();
export const heSaas = new HarmonyEndpointSaaS();

before(async () => {
	try {
		const infinityPortalAuth: InfinityPortalAuth = {
			accessKey: process.env.CI_ACCESS_KEY as string,
			clientId: process.env.CI_CLIENT_ID as string,
			gateway: process.env.CI_GATEWAY as string,
		};

		logger(`Connecting to CI ...`);
		await he.connect(infinityPortalAuth);
		logger(`Connecting to CI finished`);
		logger(`Connecting to CI as SaaS ...`);
		await heSaas.connect(infinityPortalAuth, {
			activateMssPSession: false,
		});
		logger(`Connecting to CI SaaS finished`);
	} catch (error) {
		errorLogger(`Unable to connecting ci -${JSON.stringify(error)}-, aborting tests.`);
		process.exit(1);
	}
});

after(async () => {
	try {
		logger(`Disconnecting from CI ...`);
		await he.disconnect();
		await heSaas.disconnect();
		logger(`Disconnected`);
	} catch (error) {
		errorLogger(`Unable to disconnected -${JSON.stringify(error)}-`);
	}
});
