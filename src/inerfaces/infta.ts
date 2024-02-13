import { Duration } from 'unitsnet-js';

export interface HarmonyEndpointSDKInfo {
	sdkVersion: string;
	sdkBuild: string;
	releasedOn: string;
	spec: string;
	specVersion: string;
}

export enum InfinityPortalRegion {
	EU_IRELAND = 'eu-west-1',
	US_NORTH_VIRGINIA = 'us-east-1',
	AP_AUSTRALIA = 'ap-southeast-2',
}

export interface HarmonySession {
	infinityToken?: string;
	sessionId: string;
	harmonyToken?: string;
}

export enum HarmonyErrorScope {
	NETWORKING = 'NETWORKING',
	SERVICE = 'SERVICE',
	SESSION = 'SESSION',
	INVALID_PARAMS = 'INVALID_PARAMS',
}

export interface HarmonyError {
	errorScope: HarmonyErrorScope;
	requestId: string;
	message?: string;
	url?: string;
	statusCode?: number;
	statusText?: string;
	payloadError?: any;
	networkError?: any;
}

export enum SDKConnectionState {
	CONNECTED = 'CONNECTED',
	DISCONNECTED = 'DISCONNECTED',
	CONNECTION_ISSUE = 'CONNECTION_ISSUE',
}

export class HarmonyResponse<T> {
	payload!: T;

	httpResponse: Response;

	isJob: boolean;

	duration?: Duration;

	requestId: string;

	jobId?: string;
}

export interface HarmonyEndpointSaaSOptions {
	activateMssPSession: boolean;
}

export interface InfinityPortalAuth {
	clientId: string;
	accessKey: string;
	region?: InfinityPortalRegion;
	gateway?: string;
}

export interface OnPremisePortalAuth {
	username: string;
	password: string;
	url: string;
	disableTLSChainValidation?: boolean;
}

export interface HarmonyRequestOptions {
	doNotAwaitForJobs?: boolean;
}

export interface HarmonyEndpointOptions extends HarmonyRequestOptions {}
