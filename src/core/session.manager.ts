import fetch from 'node-fetch';
import { Guid } from 'guid-typescript';
import { Duration } from 'unitsnet-js';
import { Agent } from 'https';
import { CI_GATEWAY, KEEP_ALIVE_INTERVAL, KEEP_ALIVE_PERFORM_GRACE, MSSP_KEEP_ALIVE_EXPIRATION, RUNNING_ENV } from './sdk.platform';
import {
	SDKConnectionState,
	HarmonySession,
	HarmonyResponse,
	InfinityPortalAuth,
	InfinityPortalRegion,
	HarmonyError,
	HarmonyErrorScope,
	OnPremisePortalAuth,
	HarmonyEndpointSaaSOptions,
} from '../inerfaces/infta';
import { errorLogger, logger } from './debug.logger';
import { parseFetchError } from './common';
import { ISessionManager } from '../inerfaces/core';

const CI_APPLICATION_PATH = '/app/endpoint-web-mgmt';
const EXTERNAL_API_BASE_PATH = '/harmony/endpoint/api';
const CI_AUTH_PATH = '/auth/external';

enum WorkMode {
	CLOUD = 'CLOUD',
	PREMISE = 'PREMISE',
	SAAS = 'SAAS',
}

export interface SessionOperations {
	loginOperation: () => Promise<HarmonyResponse<void>>;
	keepAliveOperation: () => Promise<HarmonyResponse<void>>;
}

export class SessionManager implements ISessionManager {
	private harmonySession: HarmonySession = {
		sessionId: Guid.create().toString(),
		infinityToken: '',
	};

	private connectionStats: SDKConnectionState = SDKConnectionState.DISCONNECTED;

	private keepAliveInterval: NodeJS.Timeout | undefined;

	private url: string;

	private sessionOperations: SessionOperations;

	private saaSOptions: HarmonyEndpointSaaSOptions;

	private infinityPortalAuth: InfinityPortalAuth;

	private onPremisePortalAuth: OnPremisePortalAuth;

	private workMode: WorkMode;

	/** The CI token expiration */
	private nextCiExpiration: Duration;

	/** The endpoint service token expiration */
	private nextEndpointSessionExpiration: Duration | undefined;

	/** The mssp service token expiration */
	private nextMssPSessionExpiration: Duration | undefined;

	/** The endpoint service token uses CI token expiration (endpoint token can be valid as long as CI token is valid, and no more) */
	private nextEndpointLoginExpiration: Duration | undefined;

	private keepAliveRunning: boolean = false;

	private dedicatedHttpAgent: Agent | undefined;

	public get baseURL(): string {
		if (this.workMode === WorkMode.PREMISE) {
			return `${this.url}${EXTERNAL_API_BASE_PATH}`;
		}
		if (this.workMode === WorkMode.SAAS) {
			return `${this.url}${CI_APPLICATION_PATH}`;
		}
		return `${this.url}${CI_APPLICATION_PATH}${EXTERNAL_API_BASE_PATH}`;
	}

	public get httpAgent(): Agent | undefined {
		return this.dedicatedHttpAgent;
	}

	private async performEndpointLogin() {
		try {
			logger(`Preforming endpoint login to session id ${this?.harmonySession?.sessionId} ...`);
			const res = await this.sessionOperations.loginOperation();
			logger(`Preforming endpoint login to session id ${this?.harmonySession?.sessionId} done`);
			const webKey = res.httpResponse?.headers?.get('x-mgmt-api-token');
			const webExpiration = +(res.httpResponse?.headers?.get('x-mgmt-session-expiry-seconds') || '0');

			this.harmonySession!.harmonyToken = webKey as string;
			this.nextEndpointSessionExpiration = Duration.FromMilliseconds(new Date().getTime()).add(Duration.FromSeconds(webExpiration));
			this.nextEndpointLoginExpiration = this.nextCiExpiration; // login is valid as long the CI token is valid
		} catch (error) {
			errorLogger(`Failed to login to endpoint for session ${this?.harmonySession?.sessionId}, error: ${JSON.stringify(error)}`);
			this.connectionStats = SDKConnectionState.CONNECTION_ISSUE;
			throw error;
		}
	}

	private async performMssPLogin() {
		try {
			logger(`Preforming mssp login to session id ${this?.harmonySession?.sessionId} ...`);
			await this.sessionOperations.loginOperation();
			logger(`Preforming mssp login to session id ${this?.harmonySession?.sessionId} done`);

			this.nextMssPSessionExpiration = Duration.FromMilliseconds(new Date().getTime()).add(MSSP_KEEP_ALIVE_EXPIRATION);
		} catch (error) {
			errorLogger(`Failed to login to mssp for session ${this?.harmonySession?.sessionId}, error: ${JSON.stringify(error)}`);
			this.connectionStats = SDKConnectionState.CONNECTION_ISSUE;
			throw error;
		}
	}

	private async performCiLogin() {
		const authUrl = `${this.url}${CI_AUTH_PATH}`;
		try {
			logger(`Preforming CI login to session id "${this?.harmonySession?.sessionId}" with url "${authUrl}"...`);
			const response = await fetch(authUrl, {
				method: 'POST',
				body: JSON.stringify({ accessKey: this.infinityPortalAuth.accessKey, clientId: this.infinityPortalAuth.clientId }),
				headers: { 'Content-Type': 'application/json' },
			});
			const payload = await response.json();

			if (!payload.success) {
				errorLogger(`Failed to login to CI GW for session "${this?.harmonySession?.sessionId}" url "${authUrl}", error payload: ${JSON.stringify(payload)}`);
				throw payload;
			}

			logger(`Preforming CI login to session id ${this?.harmonySession?.sessionId} succeeded`);
			this.harmonySession!.infinityToken = payload?.data?.token;
			this.nextCiExpiration = Duration.FromMilliseconds(new Date().getTime()).add(Duration.FromSeconds(payload?.data?.expiresIn));
			this.nextEndpointLoginExpiration = undefined;
		} catch (error) {
			const parsedError = await parseFetchError(error);
			errorLogger(`Failed to login to CI GW for session "${this?.harmonySession?.sessionId}" url "${authUrl}", error: ${JSON.stringify(parsedError)}`);
			this.connectionStats = SDKConnectionState.CONNECTION_ISSUE;
			throw parsedError;
		}
	}

	private async performKeepAlive() {
		logger(`Keep alive for session id ${this?.harmonySession?.sessionId} triggered`);
		if (this.keepAliveRunning) {
			logger(`Another keep alive for session id ${this?.harmonySession?.sessionId} already triggered, aborting`);
			return;
		}
		logger(`Preforming keepalive to session id ${this?.harmonySession?.sessionId} ...`);

		const now = new Date().getTime();
		this.keepAliveRunning = true;

		// CI relevant only when using CI GWs
		const requireCILogin = [WorkMode.CLOUD, WorkMode.SAAS].includes(this.workMode);
		// Endpoint login relevant only when using endpoint management API, and only on cloud after CI token expired
		const requireEndpointLogin = [WorkMode.CLOUD].includes(this.workMode);
		// Endpoint KA is relevant only when using endpoint management APIs
		const requireEndpointKeepAlive = [WorkMode.CLOUD, WorkMode.PREMISE].includes(this.workMode);
		// MSSP KA is relevant only when using SAAS on cloud, and consumer choose to activate MSSP session management
		const requireMssPKeepAlive = [WorkMode.SAAS].includes(this.workMode) && this.saaSOptions?.activateMssPSession;

		try {
			if (requireCILogin && (!this.nextCiExpiration || this.nextCiExpiration?.Milliseconds - now < KEEP_ALIVE_PERFORM_GRACE.Milliseconds)) {
				try {
					logger(`CI token for session ${this?.harmonySession?.sessionId} is about to expired, about to re-login...`);
					await this.performCiLogin();
					logger(`CI token for session ${this?.harmonySession?.sessionId} re-created successfully`);
				} catch (error) {
					errorLogger(`Failed to re-login to CI for session ${this?.harmonySession?.sessionId}`);
					throw error;
				}
			}

			if (
				requireEndpointLogin &&
				(!this.nextEndpointLoginExpiration || this.nextEndpointLoginExpiration.Milliseconds - now < KEEP_ALIVE_PERFORM_GRACE.Milliseconds)
			) {
				try {
					logger(`CI token for session ${this?.harmonySession?.sessionId} used by endpoint recreated, about to re-login endpoint...`);
					await this.performEndpointLogin(); // TODO: if only this failed, need to perform again login
					logger(`Token for ${this?.harmonySession?.sessionId} used by endpoint re-created successfully`);
				} catch (error) {
					errorLogger(`Failed to re-login to endpoint by CI token for session ${this?.harmonySession?.sessionId}`);
					throw error;
				}
			}

			if (
				requireEndpointKeepAlive &&
				(!this.nextEndpointSessionExpiration || this.nextEndpointSessionExpiration?.Milliseconds - now < KEEP_ALIVE_PERFORM_GRACE.Milliseconds)
			) {
				try {
					logger(`Endpoint token for session ${this?.harmonySession?.sessionId} is about to expired, about to send keep-alive..`);
					const kaRes = await this.sessionOperations.keepAliveOperation();
					logger(`Endpoint token for session ${this?.harmonySession?.sessionId} refreshed successfully`);
					const webExpiration = +(kaRes.httpResponse?.headers?.get('x-mgmt-session-expiry-seconds') || '0');
					this.nextEndpointSessionExpiration = Duration.FromMilliseconds(new Date().getTime()).add(Duration.FromSeconds(webExpiration));
					this.connectionStats = SDKConnectionState.CONNECTED;
				} catch (error) {
					errorLogger(`Failed to perform endpoint keep-alive for ${this?.harmonySession?.sessionId}`);
					throw error;
				}
			}

			if (
				requireMssPKeepAlive &&
				(!this.nextMssPSessionExpiration || this.nextMssPSessionExpiration?.Milliseconds - now < KEEP_ALIVE_PERFORM_GRACE.Milliseconds)
			) {
				try {
					logger(`MSSP token for session ${this?.harmonySession?.sessionId} is about to expired, about to send keep-alive..`);
					await this.sessionOperations.keepAliveOperation();
					logger(`MSSP token for session ${this?.harmonySession?.sessionId} refreshed successfully`);
					this.nextMssPSessionExpiration = Duration.FromMilliseconds(new Date().getTime()).add(MSSP_KEEP_ALIVE_EXPIRATION);
					this.connectionStats = SDKConnectionState.CONNECTED;
				} catch (error) {
					errorLogger(`Failed to perform MSSP keep-alive for ${this?.harmonySession?.sessionId}`);
					throw error;
				}
			}
		} catch (error) {
			errorLogger(`Failed to perform keep-alive for ${this?.harmonySession?.sessionId}`);
			this.connectionStats = SDKConnectionState.CONNECTION_ISSUE;
		} finally {
			logger(`Preforming keepalive to session id ${this?.harmonySession?.sessionId} done`);
			this.keepAliveRunning = false;
		}
	}

	public connectionState(): SDKConnectionState {
		return this.connectionStats;
	}

	private validateCloudParams(infinityPortalAuth: InfinityPortalAuth): void {
		if (!infinityPortalAuth.gateway && !infinityPortalAuth.region) {
			errorLogger('No region or gateway passed to connection, aborting connection');
			throw {
				errorScope: HarmonyErrorScope.INVALID_PARAMS,
				message: 'Passing region OR gateway is mandatory',
			} as HarmonyError;
		}

		if (!infinityPortalAuth.clientId) {
			errorLogger('No clientId passed to connection, aborting connection');
			throw {
				errorScope: HarmonyErrorScope.INVALID_PARAMS,
				message: 'Passing clientId is mandatory',
			} as HarmonyError;
		}

		if (!infinityPortalAuth.accessKey) {
			errorLogger('No accessKey passed to connection, aborting connection');
			throw {
				errorScope: HarmonyErrorScope.INVALID_PARAMS,
				message: 'Passing accessKey is mandatory',
			} as HarmonyError;
		}

		if (infinityPortalAuth.gateway) {
			try {
				const parsedUrl = new URL(infinityPortalAuth.gateway);
				if (parsedUrl.protocol !== 'https:') {
					const message = `Gateway provided ${infinityPortalAuth.gateway} is not using https protocol`;
					errorLogger(message);
					// eslint-disable-next-line @typescript-eslint/no-throw-literal
					throw {
						message,
						errorScope: HarmonyErrorScope.INVALID_PARAMS,
					} as HarmonyError;
				}

				// In any case of providing extra path (e.g. extra / in the end, etc.), take only the protocol + domain from URL.
				// eslint-disable-next-line no-param-reassign
				infinityPortalAuth.gateway = parsedUrl.origin;
				return;
			} catch (error) {
				const message = `Gateway provided ${infinityPortalAuth.gateway} is not a valid URL  "${error.message}"`;
				errorLogger(message);
				throw {
					message,
					errorScope: HarmonyErrorScope.INVALID_PARAMS,
				} as HarmonyError;
			}
		}

		if (infinityPortalAuth.region && !CI_GATEWAY[RUNNING_ENV][infinityPortalAuth?.region]) {
			const message = `Unknown region "${infinityPortalAuth.region}" please provide a valid region from ${JSON.stringify(Object.keys(CI_GATEWAY[RUNNING_ENV]))}`;
			errorLogger(message);
			throw {
				message,
				errorScope: HarmonyErrorScope.INVALID_PARAMS,
			} as HarmonyError;
		}
	}

	private validatePremiseParams(onPremisePortalAuth: OnPremisePortalAuth): void {
		if (!onPremisePortalAuth.username) {
			errorLogger('No username provided, aborting connection');
			throw {
				errorScope: HarmonyErrorScope.INVALID_PARAMS,
				message: 'Username is missing',
			} as HarmonyError;
		}

		if (!onPremisePortalAuth.password) {
			errorLogger('No password provided, aborting connection');
			throw {
				errorScope: HarmonyErrorScope.INVALID_PARAMS,
				message: 'Password is missing',
			} as HarmonyError;
		}

		if (!onPremisePortalAuth.url) {
			errorLogger('No url provided, aborting connection');
			throw {
				errorScope: HarmonyErrorScope.INVALID_PARAMS,
				message: 'URL is missing',
			} as HarmonyError;
		}

		try {
			const parsedUrl = new URL(onPremisePortalAuth.url);
			if (!parsedUrl.protocol.startsWith('http')) {
				const message = `URL provided ${onPremisePortalAuth.url} is not an http/s protocol`;
				errorLogger(message);
				throw {
					message,
					errorScope: HarmonyErrorScope.INVALID_PARAMS,
				} as HarmonyError;
			}
		} catch (error) {
			const message = `URL provided ${onPremisePortalAuth.url} is not a valid URL  "${error.message}"`;
			errorLogger(message);
			throw {
				message,
				errorScope: HarmonyErrorScope.INVALID_PARAMS,
			} as HarmonyError;
		}
	}

	private activateKeepAlive() {
		logger(`Session id ${this.harmonySession?.sessionId} is ready, starting keep-alive activation`);
		this.connectionStats = SDKConnectionState.CONNECTED;
		this.keepAliveInterval = setInterval(async () => {
			logger(`Keep alive interval triggered`);
			await this.performKeepAlive();
		}, KEEP_ALIVE_INTERVAL.Milliseconds);
	}

	public async connectCloud(infinityPortalAuth: InfinityPortalAuth, sessionOperations: SessionOperations) {
		this.workMode = WorkMode.CLOUD;
		this.validateCloudParams(infinityPortalAuth);

		this.infinityPortalAuth = infinityPortalAuth;
		this.sessionOperations = sessionOperations;

		this.url = infinityPortalAuth.gateway || CI_GATEWAY[RUNNING_ENV][infinityPortalAuth?.region || InfinityPortalRegion.EU_IRELAND];

		logger(`New cloud session started, session id ${this.harmonySession.sessionId} connecting to ${this.url} using client id ${infinityPortalAuth.clientId}`);

		await this.performCiLogin();
		await this.performEndpointLogin();
		this.activateKeepAlive();
	}

	public async connectSaas(infinityPortalAuth: InfinityPortalAuth, sessionOperations: SessionOperations, saaSOptions: HarmonyEndpointSaaSOptions) {
		this.saaSOptions = saaSOptions;
		this.sessionOperations = sessionOperations;
		this.workMode = WorkMode.SAAS;
		this.validateCloudParams(infinityPortalAuth);

		this.infinityPortalAuth = infinityPortalAuth;

		this.url = infinityPortalAuth.gateway || CI_GATEWAY[RUNNING_ENV][infinityPortalAuth?.region || InfinityPortalRegion.EU_IRELAND];

		logger(
			`New saas session started *${this.saaSOptions.activateMssPSession ? 'with' : 'without'}* MSSP session mgmt, session id ${
				this.harmonySession.sessionId
			} connecting to ${this.url} using client id ${infinityPortalAuth.clientId}`
		);

		await this.performCiLogin();
		if (this.saaSOptions.activateMssPSession) {
			await this.performMssPLogin();
		}
		this.activateKeepAlive();
	}

	public async connectPremise(onPremisePortalAuth: OnPremisePortalAuth, sessionOperations: SessionOperations) {
		this.workMode = WorkMode.PREMISE;
		this.validatePremiseParams(onPremisePortalAuth);
		this.onPremisePortalAuth = onPremisePortalAuth;
		this.sessionOperations = sessionOperations;
		this.url = onPremisePortalAuth.url;

		if (onPremisePortalAuth.disableTLSChainValidation) {
			logger(`DISABLING TLS VALIDATION, session id ${this.harmonySession.sessionId} connecting to ${this.url}`);
			this.dedicatedHttpAgent = new Agent({ rejectUnauthorized: false });
		}

		logger(`New premise session started, session id ${this.harmonySession.sessionId} connecting to ${this.url} using user ${onPremisePortalAuth.username}`);
		await this.performEndpointLogin();
		this.activateKeepAlive();
	}

	public async reconnect() {
		if (!this.workMode) {
			logger(`No connection established yet`);
			throw {
				errorScope: HarmonyErrorScope.SESSION,
				message: 'No connection established, login first',
			} as HarmonyError;
		}
		logger(`Reconnecting session ${this?.harmonySession?.sessionId}`);
		await this.disconnect();
		if (this.workMode === WorkMode.CLOUD) {
			await this.connectCloud(this.infinityPortalAuth, this.sessionOperations);
		} else if (this.workMode === WorkMode.SAAS) {
			await this.connectSaas(this.infinityPortalAuth, this.sessionOperations, this.saaSOptions);
		} else {
			await this.connectPremise(this.onPremisePortalAuth, this.sessionOperations);
		}
	}

	public async disconnect() {
		logger(`Disconnecting session ${this?.harmonySession?.sessionId}`);
		this.connectionStats = SDKConnectionState.DISCONNECTED;
		if (this.keepAliveInterval) {
			logger(`Keep-alive interval for session ${this?.harmonySession?.sessionId} cleared`);
			clearInterval(this.keepAliveInterval);
			this.keepAliveInterval = undefined;
		}
		this.harmonySession = {
			sessionId: Guid.create().toString(),
			infinityToken: '',
		};
		this.infinityPortalAuth = undefined as any;
		this.onPremisePortalAuth = undefined as any;
	}

	public getHarmonySession(): HarmonySession | undefined {
		return this.harmonySession;
	}
}
