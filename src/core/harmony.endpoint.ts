/* eslint-disable max-classes-per-file */
import { HarmonyEndpointBase as HarmonyEndpointCloudBase } from '../generated/cloud/swagger/api';
import { HarmonyEndpointBase as HarmonyEndpointPremiseBase } from '../generated/premise/swagger/api';
import { HarmonyEndpointBase as HarmonyEndpointSaasBase } from '../generated/saas/swagger/api';
import { HarmonyEndpointSaaSOptions, InfinityPortalAuth, OnPremisePortalAuth } from '../inerfaces/infta';

export class HarmonyEndpoint extends HarmonyEndpointCloudBase {
	constructor() {
		// eslint-disable-next-line no-console
		console.warn(
			`This package is currently in EA (Early Availability) stage. Use with caution, as it may undergo significant changes and improvements. Feedback and contributions are highly encouraged. To report a bug, please go to https://github.com/CheckPointSW/harmony-endpoint-management-js-ts-sdk/issues or contact us at harmony-endpoint-external-api@checkpoint.com`
		);
		super('HarmonyEndpoint');
	}

	public async connect(infinityPortalAuth: InfinityPortalAuth) {
		await this.sessionManager.connectCloud(infinityPortalAuth, {
			keepAliveOperation: () => this.SessionApi.keepAlive() as any,
			loginOperation: () => this.SessionApi.loginCloud() as any,
		});
	}
}

export class HarmonyEndpointSaaS extends HarmonyEndpointSaasBase {
	constructor() {
		// eslint-disable-next-line no-console
		console.warn(
			`This package is currently in EA (Early Availability) stage. Use with caution, as it may undergo significant changes and improvements. Feedback and contributions are highly encouraged. To report a bug, please go to https://github.com/CheckPointSW/harmony-endpoint-management-js-ts-sdk/issues or contact us at harmony-endpoint-external-api@checkpoint.com`
		);
		super('HarmonyEndpointSaaS');
	}

	public async connect(infinityPortalAuth: InfinityPortalAuth, options: HarmonyEndpointSaaSOptions) {
		await this.sessionManager.connectSaas(
			infinityPortalAuth,
			{
				keepAliveOperation: () => this.ManageSessionApi.publicMsspKeepAlive() as any,
				loginOperation: () => this.ManageSessionApi.publicMsspLogin() as any,
			},
			options
		);
	}
}

export class HarmonyEndpointPremise extends HarmonyEndpointPremiseBase {
	constructor() {
		// eslint-disable-next-line no-console
		console.warn(
			`This API is currently under development. Please make sure you know what you are doing!!! For any question contact us at harmony-endpoint-external-api@checkpoint.com`
		);
		super('HarmonyEndpointPremise');
	}

	public async connect(onPremisePortalAuth: OnPremisePortalAuth) {
		await this.sessionManager.connectPremise(onPremisePortalAuth, {
			keepAliveOperation: () => this.SessionApi.keepAlive() as any,
			loginOperation: () => this.SessionApi.loginPremise({ username: onPremisePortalAuth.username, password: onPremisePortalAuth.password }) as any,
		});
	}
}
