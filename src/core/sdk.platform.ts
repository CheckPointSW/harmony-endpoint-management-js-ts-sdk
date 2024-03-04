import { Duration } from 'unitsnet-js';
import { InfinityPortalRegion } from '../interfaces/infra';

type ENV = 'STG' | 'PROD';

export const KEEP_ALIVE_INTERVAL = Duration.FromSeconds(15);
export const KEEP_ALIVE_PERFORM_GRACE = Duration.FromSeconds(40);

export const JOBS_PULLING_INTERVAL = Duration.FromSeconds(5);

export const MAX_FAILED_PULLING_ATTEMPTS = 5;

export const MSSP_KEEP_ALIVE_EXPIRATION = Duration.FromMinutes(2);

export const RUNNING_ENV: ENV = (process.env.HARMONY_ENDPOINT_RUNNING_ENV as any) || 'PROD';

export const CI_GATEWAY: { [key in ENV]: { [region in InfinityPortalRegion]: string } } = {
	STG: {
		[InfinityPortalRegion.US_NORTH_VIRGINIA]: 'https://dev-cloudinfra-gw.kube1.iaas.checkpoint.com',
		[InfinityPortalRegion.EU_IRELAND]: 'https://dev-cloudinfra-gw.kube1.iaas.checkpoint.com',
		[InfinityPortalRegion.AP_AUSTRALIA]: 'https://dev-cloudinfra-gw.ap.portal.checkpoint.com',
	},
	PROD: {
		[InfinityPortalRegion.US_NORTH_VIRGINIA]: 'https://cloudinfra-gw-us.portal.checkpoint.com',
		[InfinityPortalRegion.EU_IRELAND]: 'https://cloudinfra-gw.portal.checkpoint.com',
		[InfinityPortalRegion.AP_AUSTRALIA]: 'https://cloudinfra-gw.ap.portal.checkpoint.com',
	},
};

export const APPLICATION_NAME = 'harmony-endpoint-management';
