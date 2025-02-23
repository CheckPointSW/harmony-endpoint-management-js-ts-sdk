/* eslint-disable max-classes-per-file */
import { HarmonyEndpointBase as HarmonyEndpointCloudBase } from '../generated/cloud/swagger/api';
// TODO: Open when on-premise will be release to public
// import { HarmonyEndpointBase as HarmonyEndpointPremiseBase } from '../generated/premise/swagger/api';
import { HarmonyEndpointBase as HarmonyEndpointSaasBase } from '../generated/saas/swagger/api';
import { HarmonyEndpointSaaSOptions, InfinityPortalAuth } from '../interfaces/infra';

export class HarmonyEndpoint extends HarmonyEndpointCloudBase {
	constructor() {
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

// TODO: Open when on-premise will be release to public
// export class HarmonyEndpointPremise extends HarmonyEndpointPremiseBase {
// 	constructor() {
// 		super('HarmonyEndpointPremise');
// 	}

// 	public async connect(onPremisePortalAuth: OnPremisePortalAuth) {
// 		await this.sessionManager.connectPremise(onPremisePortalAuth, {
// 			keepAliveOperation: () => this.SessionApi.keepAlive() as any,
// 			loginOperation: () => this.SessionApi.loginPremise({ username: onPremisePortalAuth.username, password: onPremisePortalAuth.password }) as any,
// 		});
// 	}
// }
