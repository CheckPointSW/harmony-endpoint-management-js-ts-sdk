import { Agent } from 'https';
import { HarmonySession } from './infra';

export interface ISessionManager {
	baseURL: string;
	httpAgent: Agent | undefined;
	getHarmonySession: () => HarmonySession | undefined;
}

export interface HarmonyRequestSession {
	requestId: string;
	sessionManager: ISessionManager;
}
