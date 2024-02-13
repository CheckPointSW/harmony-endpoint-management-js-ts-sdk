import { Agent } from 'https';
import { HarmonySession } from './infta';

export interface ISessionManager {
	baseURL: string;
	httpAgent: Agent | undefined;
	getHarmonySession: () => HarmonySession | undefined;
}

export interface HarmonyRequestSession {
	requestId: string;
	sessionManager: ISessionManager;
}
